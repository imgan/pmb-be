const { Op } = require('sequelize');
const { sequelize, MataKuliah, Kurikulum, Jurusan } = require('../models');
const ApiError = require('../utils/ApiError');
const { getPagination, getPagingMeta } = require('../utils/pagination');
const { resolveOrder } = require('../utils/sorting');
const { buildWorkbook, parseWorkbookFromBase64, cellString } = require('../utils/excel');
const kurikulumService = require('./kurikulum.service');

/**
 * Mata kuliah milik satu kurikulum (Kurikulum 1 ──< N MataKuliah). Prodi & tahun kurikulum
 * mengikuti kurikulum induk; filter jurusanId / tahunKurikulum diterapkan lewat kurikulum.
 */

const includeKurikulum = (where = null) => ({
  model: Kurikulum,
  as: 'kurikulum',
  attributes: ['id', 'nama', 'jurusanId', 'tahunKurikulum', 'tanggalMulaiEfektif', 'tanggalAkhirEfektif', 'isActive'],
  required: !!where,
  ...(where ? { where } : {}),
  include: [{ model: Jurusan, as: 'jurusan', attributes: ['id', 'namaJurusan', 'kodeProdi'], required: false }],
});

/** Filter kurikulum induk dari query (jurusanId, tahunKurikulum); null = tanpa filter. */
const whereKurikulum = (query) => {
  const where = {};
  if (query.jurusanId) where.jurusanId = query.jurusanId;
  if (query.tahunKurikulum) where.tahunKurikulum = Number(query.tahunKurikulum);
  return Object.keys(where).length ? where : null;
};

const SORTABLE_COLUMNS = {
  kode: ['kode'],
  mataKuliah: ['mataKuliah'],
  semester: ['semester'],
  isObe: ['isObe'],
  tahunKurikulum: [{ model: Kurikulum, as: 'kurikulum' }, 'tahunKurikulum'],
};

const listMataKuliah = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const where = {};
  if (query.kurikulumId) where.kurikulumId = query.kurikulumId;
  if (query.semester) where.semester = query.semester;
  if (query.isObe !== undefined && query.isObe !== '') where.isObe = query.isObe === 'true' || query.isObe === true;
  if (query.search) {
    where[Op.or] = [{ kode: { [Op.like]: `%${query.search}%` } }, { mataKuliah: { [Op.like]: `%${query.search}%` } }];
  }
  const { rows, count } = await MataKuliah.findAndCountAll({
    where,
    include: [includeKurikulum(whereKurikulum(query))],
    limit,
    offset,
    order: resolveOrder(query, SORTABLE_COLUMNS, [['semester', 'ASC'], ['kode', 'ASC']]),
    subQuery: false,
    distinct: true,
  });
  return { data: rows, meta: getPagingMeta(count, page, limit) };
};

const getMataKuliahById = async (id) => {
  const mk = await MataKuliah.findByPk(id, { include: [includeKurikulum()] });
  if (!mk) throw new ApiError(404, 'Mata kuliah tidak ditemukan');
  return mk;
};

const assertKurikulum = async (kurikulumId) => {
  const kurikulum = await Kurikulum.findByPk(kurikulumId);
  if (!kurikulum) throw new ApiError(400, 'Kurikulum tidak ditemukan');
  return kurikulum;
};

/** Kode mata kuliah unik di dalam satu kurikulum (kurikulum lain boleh memakai kode yang sama). */
const ensureUniqueKode = async (kurikulumId, kode, excludeId) => {
  const existing = await MataKuliah.findOne({ where: { kurikulumId, kode, ...(excludeId ? { id: { [Op.ne]: excludeId } } : {}) } });
  if (existing) throw new ApiError(400, `Kode ${kode} sudah ada di kurikulum ini`);
};

const createMataKuliah = async (payload, actorId) => {
  await assertKurikulum(payload.kurikulumId);
  await ensureUniqueKode(payload.kurikulumId, payload.kode);
  const mk = await MataKuliah.create({ ...payload, createdBy: actorId, updatedBy: actorId });
  return getMataKuliahById(mk.id);
};

const updateMataKuliah = async (id, payload, actorId) => {
  const mk = await MataKuliah.findByPk(id);
  if (!mk) throw new ApiError(404, 'Mata kuliah tidak ditemukan');
  const kurikulumId = payload.kurikulumId ?? mk.kurikulumId;
  if (payload.kurikulumId) await assertKurikulum(payload.kurikulumId);
  if (payload.kode || payload.kurikulumId) await ensureUniqueKode(kurikulumId, payload.kode ?? mk.kode, id);
  await mk.update({ ...payload, updatedBy: actorId });
  return getMataKuliahById(id);
};

const deleteMataKuliah = async (id, actorId) => {
  const mk = await MataKuliah.findByPk(id);
  if (!mk) throw new ApiError(404, 'Mata kuliah tidak ditemukan');
  await mk.update({ isDelete: true, updatedBy: actorId });
};

/**
 * Setting Kurikulum: tandai OBE + target capaian CPL/CPMK banyak mata kuliah satu kurikulum sekaligus.
 * MK non-OBE: target dikosongkan. Semua id harus milik kurikulum tsb.
 */
const saveSettingKurikulum = async ({ kurikulumId, items }, actorId) => {
  await assertKurikulum(kurikulumId);
  const ids = items.map((i) => i.id);
  const milik = await MataKuliah.count({ where: { id: ids, kurikulumId } });
  if (milik !== new Set(ids).size) throw new ApiError(400, 'Sebagian mata kuliah bukan milik kurikulum ini');
  await sequelize.transaction(async (transaction) => {
    for (const item of items) {
      await MataKuliah.update(
        {
          isObe: item.isObe,
          targetCpl: item.isObe ? item.targetCpl ?? null : null,
          targetCpmk: item.isObe ? item.targetCpmk ?? null : null,
          updatedBy: actorId,
        },
        { where: { id: item.id, kurikulumId }, transaction }
      );
    }
  });
  return { updated: items.length };
};

// ---------- Import / export (format Neo Feeder PDDIKTI) ----------

const JENIS_MATA_KULIAH_LABELS = { TEORI: 'Teori', PRAKTIK: 'Praktik', TEORI_PRAKTIK: 'Teori & Praktik' };
const jenisMataKuliahLabel = (value) => JENIS_MATA_KULIAH_LABELS[value] ?? '';
/** Menerima kode enum ("TEORI") maupun label Indonesia ("Teori") dari kolom Excel. */
const parseJenisMataKuliah = (value) => {
  const str = cellString(value).toUpperCase().replace(/\s*&\s*/g, '_').replace(/\s+/g, '_');
  return ['TEORI', 'PRAKTIK', 'TEORI_PRAKTIK'].includes(str) ? str : null;
};
const cellNumber = (value) => {
  const cleaned = cellString(value).replace(/[^0-9-]/g, '');
  if (!cleaned) return 0;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : 0;
};
// Template feeder memakai "-" untuk sel kosong (tanggal efektif, Id Matkul) — perlakukan sebagai kosong.
const cellOptional = (value) => {
  const s = cellString(value);
  return s && s !== '-' ? s : null;
};
/** Kolom "Kurikulum" Excel: ambil tahun 4 digit ("2020", "Kurikulum 2020", "2020/2021"). */
const parseTahunKurikulum = (value) => {
  const match = cellString(value).match(/(19|20)\d{2}/);
  return match ? Number(match[0]) : null;
};

/**
 * Kolom import/export mengikuti format Neo Feeder. "Kurikulum" = tahun kurikulum & "Kode Prodi" =
 * Jurusan.kodeProdi → menentukan kurikulum induk (dibuat otomatis bila belum ada). "Wajib" (Ya/Tidak)
 * → kelompokKurikulum. Tgl Mulai/Akhir Efektif adalah milik kurikulum induk.
 */
const EXPORT_COLUMNS = [
  { header: 'Kode MK', key: 'kodeMk' },
  { header: 'Nama MK', key: 'namaMk' },
  { header: 'Jenis MK', key: 'jenisMk' },
  { header: 'SKS Tatap Muka', key: 'sksTatapMuka' },
  { header: 'SKS Praktek', key: 'sksPraktek' },
  { header: 'SKS Prak Lapangan', key: 'sksPrakLapangan' },
  { header: 'SKS Simulasi', key: 'sksSimulasi' },
  { header: 'Metode Pembelajaran', key: 'metodePembelajaran' },
  { header: 'Tgl Mulai Efektif', key: 'tglMulaiEfektif' },
  { header: 'Tgl Akhir Efektif', key: 'tglAkhirEfektif' },
  { header: 'Semester', key: 'semester' },
  { header: 'Kurikulum', key: 'kurikulum' },
  { header: 'Wajib', key: 'wajib' },
  { header: 'Kode Prodi', key: 'kodeProdi' },
  { header: 'Id Matkul', key: 'idMatkul' },
  // Tambahan (bukan kolom Neo Feeder): Ya = mata kuliah OBE.
  { header: 'OBE', key: 'obe' },
];

const toExportRow = (m) => ({
  kodeMk: m.kode,
  namaMk: m.mataKuliah,
  jenisMk: jenisMataKuliahLabel(m.jenisMataKuliah),
  sksTatapMuka: m.sksTeori,
  sksPraktek: m.sksPraktek,
  sksPrakLapangan: m.sksLab,
  sksSimulasi: m.sksSimulasi,
  metodePembelajaran: m.metodePembelajaran ?? '',
  tglMulaiEfektif: m.kurikulum?.tanggalMulaiEfektif ?? '',
  tglAkhirEfektif: m.kurikulum?.tanggalAkhirEfektif ?? '',
  semester: m.semester ?? '',
  kurikulum: m.kurikulum?.tahunKurikulum ?? '',
  wajib: m.kelompokKurikulum === 'WAJIB' ? 'Ya' : m.kelompokKurikulum === 'PILIHAN' ? 'Tidak' : '',
  kodeProdi: m.kurikulum?.jurusan?.kodeProdi ?? '',
  idMatkul: m.idMatkul ?? '',
  obe: m.isObe ? 'Ya' : 'Tidak',
});

/** Export semua mata kuliah (opsional filter kurikulumId / jurusanId / tahunKurikulum). */
const exportMataKuliah = async (query = {}) => {
  const rows = await MataKuliah.findAll({
    where: query.kurikulumId ? { kurikulumId: query.kurikulumId } : {},
    include: [includeKurikulum(whereKurikulum(query))],
    order: [['kode', 'ASC']],
  });
  return buildWorkbook('Mata Kuliah', EXPORT_COLUMNS, rows.map(toExportRow));
};

const exportTemplate = () =>
  buildWorkbook('Mata Kuliah', EXPORT_COLUMNS, [
    {
      kodeMk: 'IF101',
      namaMk: 'Algoritma dan Pemrograman',
      jenisMk: 'Teori & Praktik',
      sksTatapMuka: 2,
      sksPraktek: 1,
      sksPrakLapangan: 0,
      sksSimulasi: 0,
      metodePembelajaran: 'Ceramah, Diskusi, Praktikum',
      tglMulaiEfektif: '2026-09-01',
      tglAkhirEfektif: '',
      semester: 1,
      kurikulum: 2026,
      wajib: 'Ya',
      kodeProdi: 'Kode Prodi (sesuai master Jurusan)',
      idMatkul: '',
      obe: 'Tidak',
    },
  ]);

/**
 * Import membuat baru / mengubah mata kuliah: kurikulum induk ditentukan dari Kode Prodi + Kurikulum
 * (tahun) — dibuat otomatis bila belum ada; baris dicocokkan lewat Kode MK di kurikulum tsb.
 * Bila `kurikulumId` dikirim (import dari halaman detail kurikulum), semua baris masuk ke kurikulum itu.
 */
const importMataKuliah = async (fileBase64, actorId, { kurikulumId = null } = {}) => {
  const rows = await parseWorkbookFromBase64(fileBase64);
  const errors = [];
  let successCount = 0;
  const kurikulumTetap = kurikulumId ? await assertKurikulum(kurikulumId) : null;

  for (const { rowNumber, data } of rows) {
    const kode = cellString(data['Kode MK']);
    const namaMk = cellString(data['Nama MK']);
    if (!kode) {
      errors.push({ row: rowNumber, message: 'Kode MK wajib diisi' });
      continue;
    }
    if (!namaMk) {
      errors.push({ row: rowNumber, message: 'Nama MK wajib diisi' });
      continue;
    }

    let kurikulum = kurikulumTetap;
    if (!kurikulum) {
      let jurusanId = null;
      const kodeProdi = cellString(data['Kode Prodi']);
      if (kodeProdi) {
        const jurusan = await Jurusan.findOne({ where: { kodeProdi }, order: [['id', 'ASC']] });
        if (!jurusan) {
          errors.push({ row: rowNumber, message: `Kode Prodi "${kodeProdi}" tidak ditemukan` });
          continue;
        }
        jurusanId = jurusan.id;
      }
      const kurikulumCell = cellString(data['Kurikulum']);
      const tahunKurikulum = parseTahunKurikulum(kurikulumCell);
      if (kurikulumCell && !tahunKurikulum) {
        errors.push({ row: rowNumber, message: `Kurikulum "${kurikulumCell}" harus berisi tahun, mis. 2023` });
        continue;
      }
      kurikulum = await kurikulumService.findOrCreateKurikulum({ jurusanId, tahunKurikulum }, actorId);
      const mulai = cellOptional(data['Tgl Mulai Efektif']);
      const akhir = cellOptional(data['Tgl Akhir Efektif']);
      if ((mulai && !kurikulum.tanggalMulaiEfektif) || (akhir && !kurikulum.tanggalAkhirEfektif)) {
        await kurikulum.update({
          ...(mulai && !kurikulum.tanggalMulaiEfektif ? { tanggalMulaiEfektif: mulai } : {}),
          ...(akhir && !kurikulum.tanggalAkhirEfektif ? { tanggalAkhirEfektif: akhir } : {}),
        });
      }
    }

    let jenisMataKuliah = null;
    if (cellString(data['Jenis MK'])) {
      jenisMataKuliah = parseJenisMataKuliah(data['Jenis MK']);
      if (!jenisMataKuliah) {
        errors.push({ row: rowNumber, message: `Jenis MK "${cellString(data['Jenis MK'])}" tidak dikenali` });
        continue;
      }
    }
    const wajibStr = cellString(data['Wajib']).toLowerCase();
    const payload = {
      kurikulumId: kurikulum.id,
      kode,
      mataKuliah: namaMk,
      jenisMataKuliah,
      kelompokKurikulum: wajibStr ? (['ya', 'yes', 'true', '1'].includes(wajibStr) ? 'WAJIB' : 'PILIHAN') : null,
      sksTeori: cellNumber(data['SKS Tatap Muka']),
      sksPraktek: cellNumber(data['SKS Praktek']),
      sksLab: cellNumber(data['SKS Prak Lapangan']),
      sksSimulasi: cellNumber(data['SKS Simulasi']),
      metodePembelajaran: cellString(data['Metode Pembelajaran']) || null,
      semester: cellString(data['Semester']) ? cellNumber(data['Semester']) : null,
      idMatkul: cellOptional(data['Id Matkul']),
      ...(cellString(data['OBE']) ? { isObe: ['ya', 'yes', 'true', '1', 'obe'].includes(cellString(data['OBE']).toLowerCase()) } : {}),
      updatedBy: actorId,
    };

    try {
      const existing = await MataKuliah.findOne({ where: { kurikulumId: kurikulum.id, kode } });
      if (existing) await existing.update(payload);
      else await MataKuliah.create({ ...payload, createdBy: actorId });
      successCount += 1;
    } catch (err) {
      errors.push({ row: rowNumber, message: err.message });
    }
  }
  return { successCount, errorCount: errors.length, errors };
};

module.exports = {
  includeKurikulum,
  listMataKuliah,
  getMataKuliahById,
  createMataKuliah,
  updateMataKuliah,
  deleteMataKuliah,
  exportMataKuliah,
  exportTemplate,
  importMataKuliah,
  saveSettingKurikulum,
};
