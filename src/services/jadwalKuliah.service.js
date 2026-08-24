const { Op } = require('sequelize');
const { JadwalKuliah, Dosen, TahunAjaran, MataKuliah } = require('../models');
const ApiError = require('../utils/ApiError');
const { getPagination, getPagingMeta } = require('../utils/pagination');
const { resolveOrder } = require('../utils/sorting');
const { buildWorkbook, parseWorkbookFromBase64, cellString, cellBoolean } = require('../utils/excel');

const HARI_OPTIONS = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];

/**
 * `required: false` di-set eksplisit pada tiap include — beberapa belongsTo sekaligus tanpa
 * itu terbukti bisa membuat Sequelize men-default salah satunya jadi INNER JOIN, sehingga baris
 * dengan FK nullable yang kosong (mis. mataKuliahId belum diisi) hilang dari hasil query.
 */
const includeRelations = [
  { model: Dosen, as: 'dosenKordinator', required: false },
  { model: Dosen, as: 'dosenPengampu', through: { attributes: [] }, required: false },
  { model: TahunAjaran, as: 'tahunAjaran', required: false },
  { model: MataKuliah, as: 'mataKuliah', required: false },
];

/**
 * KelasKuliah (jadwal_kuliah) keeps its own kodeMataKuliah/namaMataKuliah/sks columns for
 * backward compatibility with existing reports/exports, but when mataKuliahId is set it's
 * now the source of truth — sync the denormalized fields from it so they can't drift apart.
 */
const syncFromMataKuliah = async (payload) => {
  if (!payload.mataKuliahId) return payload;
  const mk = await MataKuliah.findByPk(payload.mataKuliahId);
  if (!mk) throw new ApiError(400, 'Mata kuliah not found');
  return { ...payload, kodeMataKuliah: mk.kodeMk, namaMataKuliah: mk.namaMk, sks: mk.sks };
};

const SORTABLE_COLUMNS = {
  kelas: ['kelas'],
  kodeMataKuliah: ['kodeMataKuliah'],
  namaMataKuliah: ['namaMataKuliah'],
  jam: ['jam'],
  ruangan: ['ruangan'],
  dosenKordinator: [{ model: Dosen, as: 'dosenKordinator' }, 'namaLengkap'],
  status: ['isActive'],
};

const listJadwalKuliah = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const where = {};
  if (query.search) {
    where[Op.or] = [
      { kelas: { [Op.like]: `%${query.search}%` } },
      { kodeMataKuliah: { [Op.like]: `%${query.search}%` } },
      { namaMataKuliah: { [Op.like]: `%${query.search}%` } },
    ];
  }
  if (query.isActive !== undefined) {
    where.isActive = query.isActive === 'true' || query.isActive === true;
  }
  if (query.kelas) {
    where.kelas = query.kelas;
  }
  if (query.tahunAjaranId) {
    where.tahunAjaranId = query.tahunAjaranId;
  }

  const { rows, count } = await JadwalKuliah.findAndCountAll({
    where,
    include: includeRelations,
    limit,
    offset,
    order: resolveOrder(query, SORTABLE_COLUMNS, [['kelas', 'ASC']]),
    subQuery: false,
    distinct: true,
  });
  return { data: rows, meta: getPagingMeta(count, page, limit) };
};

const getKelasOptions = async () => {
  const rows = await JadwalKuliah.findAll({
    attributes: ['kelas'],
    group: ['kelas'],
    order: [['kelas', 'ASC']],
    raw: true,
  });
  return rows.map((row) => row.kelas);
};

const getJadwalKuliahById = async (id) => {
  const jadwal = await JadwalKuliah.findByPk(id, { include: includeRelations });
  if (!jadwal) throw new ApiError(404, 'Jadwal kuliah not found');
  return jadwal;
};

const createJadwalKuliah = async (payload, actorId) => {
  const { dosenPengampuIds = [], ...rest } = await syncFromMataKuliah(payload);
  if (rest.sksTeori === undefined) rest.sksTeori = rest.sks ?? 0;
  const jadwal = await JadwalKuliah.create({ ...rest, createdBy: actorId, updatedBy: actorId });
  if (dosenPengampuIds.length) {
    await jadwal.setDosenPengampu(dosenPengampuIds);
  }
  return getJadwalKuliahById(jadwal.id);
};

const updateJadwalKuliah = async (id, payload, actorId) => {
  const jadwal = await getJadwalKuliahById(id);
  const { dosenPengampuIds, ...rest } = await syncFromMataKuliah(payload);
  await jadwal.update({ ...rest, updatedBy: actorId });
  if (dosenPengampuIds !== undefined) {
    await jadwal.setDosenPengampu(dosenPengampuIds);
  }
  return getJadwalKuliahById(id);
};

const deleteJadwalKuliah = async (id) => {
  const jadwal = await getJadwalKuliahById(id);
  await jadwal.destroy();
};

const EXPORT_COLUMNS = [
  { header: 'Kelas', key: 'kelas' },
  { header: 'Kode Mata Kuliah', key: 'kodeMataKuliah' },
  { header: 'Mata Kuliah', key: 'namaMataKuliah' },
  { header: 'SKS', key: 'sks' },
  { header: 'SKS Teori', key: 'sksTeori' },
  { header: 'SKS Praktik', key: 'sksPraktik' },
  { header: 'SKS Lab', key: 'sksLab' },
  { header: 'Dosen Kordinator (NIDN)', key: 'dosenKordinatorNidn' },
  { header: 'Dosen Pengampu (NIDN)', key: 'dosenPengampuNidn' },
  { header: 'Tahun Ajaran', key: 'tahunAjaran' },
  { header: 'Hari', key: 'hari' },
  { header: 'Jam', key: 'jam' },
  { header: 'Ruangan', key: 'ruangan' },
  { header: 'GCR', key: 'gcr' },
  { header: 'Status Aktif', key: 'statusAktif' },
];

const exportJadwalKuliah = async () => {
  const rows = await JadwalKuliah.findAll({ include: includeRelations, order: [['kelas', 'ASC']] });
  const data = rows.map((j) => ({
    kelas: j.kelas,
    kodeMataKuliah: j.kodeMataKuliah,
    namaMataKuliah: j.namaMataKuliah,
    sks: j.sks,
    sksTeori: j.sksTeori,
    sksPraktik: j.sksPraktik,
    sksLab: j.sksLab,
    dosenKordinatorNidn: j.dosenKordinator?.nidn ?? '',
    dosenPengampuNidn: (j.dosenPengampu ?? []).map((d) => d.nidn).join(', '),
    tahunAjaran: j.tahunAjaran?.nama ?? '',
    hari: (j.hari ?? []).join(', '),
    jam: j.jam,
    ruangan: j.ruangan,
    gcr: j.gcr,
    statusAktif: j.isActive ? 'Ya' : 'Tidak',
  }));
  return buildWorkbook('Jadwal Kuliah', EXPORT_COLUMNS, data);
};

const exportJadwalKuliahTemplate = () => {
  const sample = {
    kelas: 'TI4AM',
    kodeMataKuliah: 'IF401',
    namaMataKuliah: 'Contoh Mata Kuliah',
    sks: 3,
    sksTeori: 2,
    sksPraktik: 1,
    sksLab: 0,
    dosenKordinatorNidn: 'NIDN dosen (sesuai master data)',
    dosenPengampuNidn: 'NIDN dosen, pisahkan koma (opsional)',
    tahunAjaran: '2026/2027 (informasi saja, tidak diproses saat import)',
    hari: 'SENIN, RABU',
    jam: 1,
    ruangan: '4.01 A',
    gcr: '',
    statusAktif: 'Ya',
  };
  return buildWorkbook('Jadwal Kuliah', EXPORT_COLUMNS, [sample]);
};

/**
 * Import upsert berdasarkan kombinasi Kelas + Kode Mata Kuliah (tidak ada kunci bisnis
 * tunggal lain yang lebih natural untuk baris jadwal). Dosen Kordinator & Dosen Pengampu
 * dicocokkan lewat NIDN.
 */
const importJadwalKuliah = async (fileBase64, actorId) => {
  const rows = await parseWorkbookFromBase64(fileBase64);
  const errors = [];
  let successCount = 0;

  for (const { rowNumber, data } of rows) {
    const kelas = cellString(data['Kelas']);
    const kodeMataKuliah = cellString(data['Kode Mata Kuliah']);
    const namaMataKuliah = cellString(data['Mata Kuliah']);
    const dosenKordinatorNidn = cellString(data['Dosen Kordinator (NIDN)']);

    if (!kelas || !kodeMataKuliah || !namaMataKuliah || !dosenKordinatorNidn) {
      errors.push({
        row: rowNumber,
        message: 'Kelas, Kode Mata Kuliah, Mata Kuliah, dan Dosen Kordinator (NIDN) wajib diisi',
      });
      continue;
    }

    const dosenKordinator = await Dosen.findOne({ where: { nidn: dosenKordinatorNidn } });
    if (!dosenKordinator) {
      errors.push({ row: rowNumber, message: `Dosen dengan NIDN "${dosenKordinatorNidn}" tidak ditemukan` });
      continue;
    }

    const pengampuNidns = cellString(data['Dosen Pengampu (NIDN)'])
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const pengampuDosen = pengampuNidns.length
      ? await Dosen.findAll({ where: { nidn: { [Op.in]: pengampuNidns } } })
      : [];

    const hariRaw = cellString(data['Hari'])
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter((h) => HARI_OPTIONS.includes(h));

    const sks = Number(data['SKS']) || null;
    const jamRaw = data['Jam'];
    const jam = jamRaw !== undefined && jamRaw !== null && jamRaw !== '' ? Number(jamRaw) : null;

    const payload = {
      kelas,
      kodeMataKuliah,
      namaMataKuliah,
      sks,
      sksTeori: Number(data['SKS Teori']) || 0,
      sksPraktik: Number(data['SKS Praktik']) || 0,
      sksLab: Number(data['SKS Lab']) || 0,
      dosenKordinatorId: dosenKordinator.id,
      hari: hariRaw.length ? hariRaw : null,
      jam,
      ruangan: cellString(data['Ruangan']) || null,
      gcr: cellString(data['GCR']) || null,
      isActive: cellBoolean(data['Status Aktif'], true),
      updatedBy: actorId,
    };

    try {
      let jadwal = await JadwalKuliah.findOne({ where: { kelas, kodeMataKuliah } });
      if (jadwal) {
        await jadwal.update(payload);
      } else {
        jadwal = await JadwalKuliah.create({ ...payload, createdBy: actorId });
      }
      await jadwal.setDosenPengampu(pengampuDosen.map((d) => d.id));
      successCount += 1;
    } catch (err) {
      errors.push({ row: rowNumber, message: err.message });
    }
  }

  return { successCount, errorCount: errors.length, errors };
};

module.exports = {
  listJadwalKuliah,
  getKelasOptions,
  getJadwalKuliahById,
  createJadwalKuliah,
  updateJadwalKuliah,
  deleteJadwalKuliah,
  exportJadwalKuliah,
  exportJadwalKuliahTemplate,
  importJadwalKuliah,
};
