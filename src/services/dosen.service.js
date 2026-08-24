const { Op, fn, col } = require('sequelize');
const { Dosen } = require('../models');
const ApiError = require('../utils/ApiError');
const { getPagination, getPagingMeta } = require('../utils/pagination');
const { resolveOrder } = require('../utils/sorting');
const { buildWorkbook, parseWorkbookFromBase64, cellString, cellBoolean } = require('../utils/excel');

const KELOMPOK_FAKULTAS_VALUES = ['FKF', 'FTID', 'FIP', 'NON_BASE'];
const STATUS_DOSEN_VALUES = ['TETAP', 'TIDAK_TETAP'];

const SORTABLE_COLUMNS = {
  namaLengkap: ['namaLengkap'],
  nidn: ['nidn'],
  nik: ['nik'],
  tanggalLahir: ['tanggalLahir'],
};

const listDosen = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const where = {};
  if (query.search) {
    where[Op.or] = [
      { namaLengkap: { [Op.like]: `%${query.search}%` } },
      { nidn: { [Op.like]: `%${query.search}%` } },
      { nik: { [Op.like]: `%${query.search}%` } },
    ];
  }
  if (query.kelompokFakultas) {
    where.kelompokFakultas = query.kelompokFakultas;
  }

  const { rows, count } = await Dosen.findAndCountAll({
    where,
    limit,
    offset,
    order: resolveOrder(query, SORTABLE_COLUMNS),
  });

  return { data: rows, meta: getPagingMeta(count, page, limit) };
};

const getDosenStats = async () => {
  const rows = await Dosen.findAll({
    attributes: ['kelompokFakultas', [fn('COUNT', col('id')), 'total']],
    group: ['kelompokFakultas'],
    raw: true,
  });
  return rows.map((row) => ({ kelompokFakultas: row.kelompokFakultas, total: Number(row.total) }));
};

const getDosenById = async (id) => {
  const dosen = await Dosen.findByPk(id);
  if (!dosen) throw new ApiError(404, 'Dosen not found');
  return dosen;
};

const ensureUniqueFields = async (payload, excludeId) => {
  if (payload.nidn) {
    const existing = await Dosen.findOne({ where: { nidn: payload.nidn, ...(excludeId ? { id: { [Op.ne]: excludeId } } : {}) } });
    if (existing) throw new ApiError(400, 'NIDN sudah digunakan');
  }
  if (payload.nik) {
    const existing = await Dosen.findOne({ where: { nik: payload.nik, ...(excludeId ? { id: { [Op.ne]: excludeId } } : {}) } });
    if (existing) throw new ApiError(400, 'NIK sudah digunakan');
  }
};

const createDosen = async (payload, actorId) => {
  await ensureUniqueFields(payload);
  const dosen = await Dosen.create({ ...payload, createdBy: actorId, updatedBy: actorId });
  return getDosenById(dosen.id);
};

const updateDosen = async (id, payload, actorId) => {
  const dosen = await getDosenById(id);
  await ensureUniqueFields(payload, id);
  await dosen.update({ ...payload, updatedBy: actorId });
  return getDosenById(id);
};

const deleteDosen = async (id, actorId) => {
  const dosen = await getDosenById(id);
  await dosen.update({ isDelete: true, updatedBy: actorId });
};

const EXPORT_COLUMNS = [
  { header: 'NIK', key: 'nik' },
  { header: 'NIDN', key: 'nidn' },
  { header: 'Nama Lengkap', key: 'namaLengkap' },
  { header: 'Tempat Lahir', key: 'tempatLahir' },
  { header: 'Tanggal Lahir', key: 'tanggalLahir' },
  { header: 'Jenis Kelamin', key: 'jenisKelamin' },
  { header: 'Pendidikan Akhir', key: 'pendidikanAkhir' },
  { header: 'Agama', key: 'agama' },
  { header: 'Telp/HP', key: 'telpHp' },
  { header: 'Email', key: 'email' },
  { header: 'Alamat', key: 'alamat' },
  { header: 'Status Dosen', key: 'statusDosen' },
  { header: 'Status', key: 'status' },
  { header: 'Waktu', key: 'waktu' },
  { header: 'TMT', key: 'tmt' },
  { header: 'Kelompok Fakultas', key: 'kelompokFakultas' },
  { header: 'Status Aktif', key: 'statusAktif' },
];

const exportDosen = async () => {
  const rows = await Dosen.findAll({ order: [['namaLengkap', 'ASC']] });
  const data = rows.map((d) => ({
    nik: d.nik,
    nidn: d.nidn,
    namaLengkap: d.namaLengkap,
    tempatLahir: d.tempatLahir,
    tanggalLahir: d.tanggalLahir,
    jenisKelamin: d.jenisKelamin,
    pendidikanAkhir: d.pendidikanAkhir,
    agama: d.agama,
    telpHp: d.telpHp,
    email: d.email,
    alamat: d.alamat,
    statusDosen: d.statusDosen,
    status: d.status,
    waktu: d.waktu,
    tmt: d.tmt,
    kelompokFakultas: d.kelompokFakultas,
    statusAktif: d.isActive ? 'Ya' : 'Tidak',
  }));
  return buildWorkbook('Dosen', EXPORT_COLUMNS, data);
};

const exportDosenTemplate = () => {
  const sample = {
    nik: 'D0001',
    nidn: '0000000000',
    namaLengkap: 'Contoh Nama Dosen',
    tempatLahir: 'Jakarta',
    tanggalLahir: '1985-01-01',
    jenisKelamin: 'L',
    pendidikanAkhir: 'S2',
    agama: 'Islam',
    telpHp: '081234567890',
    email: 'contoh@email.com',
    alamat: 'Jl. Contoh No. 1',
    statusDosen: 'TETAP',
    status: 'INSTITUSI',
    waktu: 'P',
    tmt: '2015-01-01',
    kelompokFakultas: 'FTID',
    statusAktif: 'Ya',
  };
  return buildWorkbook('Dosen', EXPORT_COLUMNS, [sample]);
};

const importDosen = async (fileBase64, actorId) => {
  const rows = await parseWorkbookFromBase64(fileBase64);
  const errors = [];
  let successCount = 0;

  for (const { rowNumber, data } of rows) {
    const nidn = cellString(data['NIDN']);
    const namaLengkap = cellString(data['Nama Lengkap']);
    const kelompokFakultasRaw = cellString(data['Kelompok Fakultas']).toUpperCase();
    if (!nidn || !namaLengkap) {
      errors.push({ row: rowNumber, message: 'NIDN dan Nama Lengkap wajib diisi' });
      continue;
    }
    if (!KELOMPOK_FAKULTAS_VALUES.includes(kelompokFakultasRaw)) {
      errors.push({ row: rowNumber, message: `Kelompok Fakultas harus salah satu dari: ${KELOMPOK_FAKULTAS_VALUES.join(', ')}` });
      continue;
    }

    const jenisKelaminRaw = cellString(data['Jenis Kelamin']).toUpperCase();
    const statusDosenRaw = cellString(data['Status Dosen']).toUpperCase();
    const waktuRaw = cellString(data['Waktu']).toUpperCase();

    const payload = {
      nik: cellString(data['NIK']) || null,
      nidn,
      namaLengkap,
      tempatLahir: cellString(data['Tempat Lahir']) || null,
      tanggalLahir: cellString(data['Tanggal Lahir']) || null,
      jenisKelamin: ['L', 'P'].includes(jenisKelaminRaw) ? jenisKelaminRaw : null,
      pendidikanAkhir: cellString(data['Pendidikan Akhir']) || null,
      agama: cellString(data['Agama']) || null,
      telpHp: cellString(data['Telp/HP']) || null,
      email: cellString(data['Email']) || null,
      alamat: cellString(data['Alamat']) || null,
      statusDosen: STATUS_DOSEN_VALUES.includes(statusDosenRaw) ? statusDosenRaw : null,
      status: cellString(data['Status']) || null,
      waktu: ['M', 'P'].includes(waktuRaw) ? waktuRaw : null,
      tmt: cellString(data['TMT']) || null,
      kelompokFakultas: kelompokFakultasRaw,
      isActive: cellBoolean(data['Status Aktif'], true),
    };

    try {
      const existing = await Dosen.findOne({ where: { nidn } });
      if (existing) {
        await existing.update({ ...payload, updatedBy: actorId });
      } else {
        await Dosen.create({ ...payload, createdBy: actorId, updatedBy: actorId });
      }
      successCount += 1;
    } catch (err) {
      errors.push({ row: rowNumber, message: err.message });
    }
  }

  return { successCount, errorCount: errors.length, errors };
};

module.exports = {
  listDosen,
  getDosenStats,
  getDosenById,
  createDosen,
  updateDosen,
  deleteDosen,
  exportDosen,
  exportDosenTemplate,
  importDosen,
};
