const { Op } = require('sequelize');
const { Kurikulum, Jurusan, TahunAjaran, JadwalKuliah } = require('../models');
const ApiError = require('../utils/ApiError');
const { getPagination, getPagingMeta } = require('../utils/pagination');
const { resolveOrder } = require('../utils/sorting');
const { buildWorkbook, parseWorkbookFromBase64, cellString } = require('../utils/excel');

/**
 * `required: false` di-set eksplisit pada tiap include — beberapa belongsTo sekaligus tanpa
 * itu terbukti bisa membuat Sequelize men-default salah satunya jadi INNER JOIN, sehingga baris
 * dengan FK nullable yang kosong (mis. jurusanId belum diisi) hilang dari hasil query.
 */
const includeRelations = [
  { model: Jurusan, as: 'jurusan', required: false },
  { model: TahunAjaran, as: 'tahunAjaran', required: false },
];

const SORTABLE_COLUMNS = {
  kode: ['kode'],
  mataKuliah: ['mataKuliah'],
  semester: ['semester'],
  tahunAjaran: [{ model: TahunAjaran, as: 'tahunAjaran' }, 'nama'],
};

const listKurikulum = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const where = {};
  if (query.search) {
    where[Op.or] = [
      { kode: { [Op.like]: `%${query.search}%` } },
      { mataKuliah: { [Op.like]: `%${query.search}%` } },
    ];
  }
  if (query.jurusanId) where.jurusanId = query.jurusanId;
  if (query.tahunAjaranId) where.tahunAjaranId = query.tahunAjaranId;
  if (query.semester) where.semester = query.semester;

  const { rows, count } = await Kurikulum.findAndCountAll({
    where,
    include: includeRelations,
    limit,
    offset,
    order: resolveOrder(query, SORTABLE_COLUMNS, [['id', 'DESC']]),
    subQuery: false,
    distinct: true,
  });
  return { data: rows, meta: getPagingMeta(count, page, limit) };
};

/**
 * "Matakuliah Aktif" = mata kuliah dari kurikulum (difilter Prodi/Tahun Kurikulum/Semester
 * Kurikulum) yang benar-benar dijadwalkan (punya JadwalKuliah) pada tahun akademik + semester
 * aktif yang dipilih. Join dilakukan lewat kode matakuliah karena Kurikulum.kode dan
 * JadwalKuliah.kodeMataKuliah sama-sama string, tidak ada FK langsung antar keduanya.
 */
const listMatakuliahAktif = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const where = {};
  if (query.jurusanId) where.jurusanId = query.jurusanId;
  if (query.tahunAjaranId) where.tahunAjaranId = query.tahunAjaranId;
  if (query.semester) where.semester = query.semester;
  if (query.search) {
    where[Op.or] = [
      { kode: { [Op.like]: `%${query.search}%` } },
      { mataKuliah: { [Op.like]: `%${query.search}%` } },
    ];
  }

  if (query.aktifTahunAjaranId && query.aktifSemester) {
    const jadwalRows = await JadwalKuliah.findAll({
      where: { tahunAjaranId: query.aktifTahunAjaranId, semester: query.aktifSemester },
      attributes: ['kodeMataKuliah'],
      group: ['kodeMataKuliah'],
      raw: true,
    });
    const activeKodeList = jadwalRows.map((r) => r.kodeMataKuliah);
    where.kode = { [Op.in]: activeKodeList.length ? activeKodeList : [''] };
  }

  const { rows, count } = await Kurikulum.findAndCountAll({
    where,
    include: includeRelations,
    limit,
    offset,
    order: resolveOrder(query, SORTABLE_COLUMNS, [['mataKuliah', 'ASC']]),
    subQuery: false,
    distinct: true,
  });
  return { data: rows, meta: getPagingMeta(count, page, limit) };
};

const getKurikulumById = async (id) => {
  const item = await Kurikulum.findByPk(id, { include: includeRelations });
  if (!item) throw new ApiError(404, 'Data kurikulum tidak ditemukan');
  return item;
};

const createKurikulum = async (payload, actorId) => {
  const item = await Kurikulum.create({ ...payload, createdBy: actorId, updatedBy: actorId });
  return getKurikulumById(item.id);
};

const updateKurikulum = async (id, payload, actorId) => {
  const item = await getKurikulumById(id);
  await item.update({ ...payload, updatedBy: actorId });
  return getKurikulumById(id);
};

const deleteKurikulum = async (id) => {
  const item = await getKurikulumById(id);
  await item.update({ isDelete: true });
};

const JENIS_MATA_KULIAH_LABELS = { TEORI: 'Teori', PRAKTIK: 'Praktik', TEORI_PRAKTIK: 'Teori & Praktik' };
const jenisMataKuliahLabel = (value) => JENIS_MATA_KULIAH_LABELS[value] ?? '';
/** Menerima kode enum ("TEORI") maupun label Indonesia ("Teori") dari kolom Excel. */
const parseJenisMataKuliah = (value) => {
  const str = cellString(value).toUpperCase().replace(/\s*&\s*/g, '_').replace(/\s+/g, '_');
  if (['TEORI', 'PRAKTIK', 'TEORI_PRAKTIK'].includes(str)) return str;
  return null;
};

const cellNumber = (value) => {
  const cleaned = cellString(value).replace(/[^0-9-]/g, '');
  if (!cleaned) return 0;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : 0;
};

const cellDate = (value) => cellString(value) || null;

/**
 * Kolom import/export mengikuti format Neo Feeder PDDIKTI untuk data kurikulum/mata kuliah.
 * "Kurikulum" dicocokkan ke TahunAjaran.nama (field ini di sistem kita disebut "Tahun
 * Kurikulum" — lihat KurikulumView.vue), "Kode Prodi" dicocokkan ke Jurusan.kodeProdi, dan
 * "Wajib" (Ya/Tidak) dipetakan ke kelompokKurikulum (WAJIB/PILIHAN). Pencocokan baris saat
 * import memakai "Kode MK" — kalau sudah ada (kode + prodi yang sama) datanya di-update,
 * kalau belum ada dibuatkan baris baru.
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
];

const exportKurikulum = async () => {
  const rows = await Kurikulum.findAll({ include: includeRelations, order: [['kode', 'ASC']] });
  const data = rows.map((k) => ({
    kodeMk: k.kode,
    namaMk: k.mataKuliah,
    jenisMk: jenisMataKuliahLabel(k.jenisMataKuliah),
    sksTatapMuka: k.sksTeori,
    sksPraktek: k.sksPraktek,
    sksPrakLapangan: k.sksLab,
    sksSimulasi: k.sksSimulasi,
    metodePembelajaran: k.metodePembelajaran ?? '',
    tglMulaiEfektif: k.tanggalMulaiEfektif ?? '',
    tglAkhirEfektif: k.tanggalAkhirEfektif ?? '',
    semester: k.semester ?? '',
    kurikulum: k.tahunAjaran?.nama ?? '',
    wajib: k.kelompokKurikulum === 'WAJIB' ? 'Ya' : k.kelompokKurikulum === 'PILIHAN' ? 'Tidak' : '',
    kodeProdi: k.jurusan?.kodeProdi ?? '',
    idMatkul: k.idMatkul ?? '',
  }));
  return buildWorkbook('Kurikulum', EXPORT_COLUMNS, data);
};

const exportKurikulumTemplate = () => {
  const sample = {
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
    kurikulum: 'Nama Tahun Kurikulum (sesuai master Tahun Ajaran)',
    wajib: 'Ya',
    kodeProdi: 'Kode Prodi (sesuai master Jurusan)',
    idMatkul: '',
  };
  return buildWorkbook('Kurikulum', EXPORT_COLUMNS, [sample]);
};

/**
 * Import MEMBUAT baru sekaligus MENGUBAH yang sudah ada — dicocokkan lewat kombinasi Kode MK +
 * Prodi (kalau Kode Prodi diisi) atau Kode MK + Kurikulum (kalau Kode Prodi kosong), dipakai
 * untuk migrasi data kurikulum dari sistem/feeder lama.
 */
const importKurikulum = async (fileBase64, actorId) => {
  const rows = await parseWorkbookFromBase64(fileBase64);
  const errors = [];
  let successCount = 0;

  for (const { rowNumber, data } of rows) {
    const kode = cellString(data['Kode MK']);
    if (!kode) {
      errors.push({ row: rowNumber, message: 'Kode MK wajib diisi' });
      continue;
    }
    const namaMk = cellString(data['Nama MK']);
    if (!namaMk) {
      errors.push({ row: rowNumber, message: 'Nama MK wajib diisi' });
      continue;
    }

    let jurusanId = null;
    const kodeProdi = cellString(data['Kode Prodi']);
    if (kodeProdi) {
      const jurusan = await Jurusan.findOne({ where: { kodeProdi } });
      if (!jurusan) {
        errors.push({ row: rowNumber, message: `Kode Prodi "${kodeProdi}" tidak ditemukan` });
        continue;
      }
      jurusanId = jurusan.id;
    }

    let tahunAjaranId = null;
    const kurikulumNama = cellString(data['Kurikulum']);
    if (kurikulumNama) {
      const tahunAjaran = await TahunAjaran.findOne({ where: { nama: kurikulumNama } });
      if (!tahunAjaran) {
        errors.push({ row: rowNumber, message: `Kurikulum "${kurikulumNama}" (Tahun Ajaran) tidak ditemukan` });
        continue;
      }
      tahunAjaranId = tahunAjaran.id;
    }

    let jenisMataKuliah = null;
    if (data['Jenis MK'] !== undefined && cellString(data['Jenis MK'])) {
      jenisMataKuliah = parseJenisMataKuliah(data['Jenis MK']);
      if (!jenisMataKuliah) {
        errors.push({ row: rowNumber, message: `Jenis MK "${cellString(data['Jenis MK'])}" tidak dikenali` });
        continue;
      }
    }

    const wajibStr = cellString(data['Wajib']).toLowerCase();
    const kelompokKurikulum = wajibStr ? (['ya', 'yes', 'true', '1'].includes(wajibStr) ? 'WAJIB' : 'PILIHAN') : null;

    const payload = {
      kode,
      mataKuliah: namaMk,
      jurusanId,
      tahunAjaranId,
      jenisMataKuliah,
      kelompokKurikulum,
      sksTeori: cellNumber(data['SKS Tatap Muka']),
      sksPraktek: cellNumber(data['SKS Praktek']),
      sksLab: cellNumber(data['SKS Prak Lapangan']),
      sksSimulasi: cellNumber(data['SKS Simulasi']),
      metodePembelajaran: cellString(data['Metode Pembelajaran']) || null,
      tanggalMulaiEfektif: cellDate(data['Tgl Mulai Efektif']),
      tanggalAkhirEfektif: cellDate(data['Tgl Akhir Efektif']),
      semester: data['Semester'] !== undefined && cellString(data['Semester']) ? cellNumber(data['Semester']) : null,
      idMatkul: cellString(data['Id Matkul']) || null,
      updatedBy: actorId,
    };

    try {
      const existing = await Kurikulum.findOne({ where: { kode, jurusanId, tahunAjaranId } });
      if (existing) {
        await existing.update(payload);
      } else {
        await Kurikulum.create({ ...payload, createdBy: actorId });
      }
      successCount += 1;
    } catch (err) {
      errors.push({ row: rowNumber, message: err.message });
    }
  }

  return { successCount, errorCount: errors.length, errors };
};

module.exports = {
  listKurikulum,
  listMatakuliahAktif,
  getKurikulumById,
  createKurikulum,
  updateKurikulum,
  deleteKurikulum,
  exportKurikulum,
  exportKurikulumTemplate,
  importKurikulum,
};
