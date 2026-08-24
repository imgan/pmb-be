const { Op } = require('sequelize');
const { Karyawan } = require('../models');
const ApiError = require('../utils/ApiError');
const { getPagination, getPagingMeta } = require('../utils/pagination');
const { resolveOrder } = require('../utils/sorting');
const { buildWorkbook, parseWorkbookFromBase64, cellString, cellBoolean } = require('../utils/excel');

const SORTABLE_COLUMNS = {
  nip: ['nip'],
  namaLengkap: ['namaLengkap'],
  idFinger: ['idFinger'],
  bagian: ['bagian'],
  tanggalLahir: ['tanggalLahir'],
  status: ['isActive'],
};

const listKaryawan = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const where = {};
  if (query.search) {
    where[Op.or] = [
      { nip: { [Op.like]: `%${query.search}%` } },
      { namaLengkap: { [Op.like]: `%${query.search}%` } },
      { bagian: { [Op.like]: `%${query.search}%` } },
    ];
  }
  if (query.isActive !== undefined) {
    where.isActive = query.isActive === 'true' || query.isActive === true;
  }

  const { rows, count } = await Karyawan.findAndCountAll({
    where,
    limit,
    offset,
    order: resolveOrder(query, SORTABLE_COLUMNS, [['namaLengkap', 'ASC']]),
  });
  return { data: rows, meta: getPagingMeta(count, page, limit) };
};

const getKaryawanById = async (id) => {
  const karyawan = await Karyawan.findByPk(id);
  if (!karyawan) throw new ApiError(404, 'Karyawan not found');
  return karyawan;
};

const ensureUniqueNip = async (nip, excludeId) => {
  const where = { nip };
  if (excludeId) where.id = { [Op.ne]: excludeId };
  const existing = await Karyawan.findOne({ where });
  if (existing) throw new ApiError(409, 'NIP sudah digunakan');
};

const createKaryawan = async (payload, actorId) => {
  await ensureUniqueNip(payload.nip);
  return Karyawan.create({ ...payload, createdBy: actorId, updatedBy: actorId });
};

const updateKaryawan = async (id, payload, actorId) => {
  const karyawan = await getKaryawanById(id);
  if (payload.nip) {
    await ensureUniqueNip(payload.nip, id);
  }
  await karyawan.update({ ...payload, updatedBy: actorId });
  return karyawan;
};

const deleteKaryawan = async (id) => {
  const karyawan = await getKaryawanById(id);
  await karyawan.update({ isDelete: true });
};

const getGenderSummary = async () => {
  const [laki, perempuan] = await Promise.all([
    Karyawan.count({ where: { jenisKelamin: 'L' } }),
    Karyawan.count({ where: { jenisKelamin: 'P' } }),
  ]);
  return { lakiLaki: laki, perempuan };
};

const EXPORT_COLUMNS = [
  { header: 'NIP', key: 'nip' },
  { header: 'Nama Lengkap', key: 'namaLengkap' },
  { header: 'ID-Finger', key: 'idFinger' },
  { header: 'Tempat Lahir', key: 'tempatLahir' },
  { header: 'Tanggal Lahir', key: 'tanggalLahir' },
  { header: 'Jenis Kelamin', key: 'jenisKelamin' },
  { header: 'Pendidikan Akhir', key: 'pendidikanAkhir' },
  { header: 'Agama', key: 'agama' },
  { header: 'No HP', key: 'telpHp' },
  { header: 'Email', key: 'email' },
  { header: 'Alamat', key: 'alamat' },
  { header: 'Bagian', key: 'bagian' },
  { header: 'Jabatan', key: 'jabatan' },
  { header: 'Status Kepegawaian', key: 'status' },
  { header: 'TMT', key: 'tmt' },
  { header: 'Status Aktif', key: 'statusAktif' },
];

const exportKaryawan = async () => {
  const rows = await Karyawan.findAll({ order: [['namaLengkap', 'ASC']] });
  const data = rows.map((k) => ({
    nip: k.nip,
    namaLengkap: k.namaLengkap,
    idFinger: k.idFinger,
    tempatLahir: k.tempatLahir,
    tanggalLahir: k.tanggalLahir,
    jenisKelamin: k.jenisKelamin,
    pendidikanAkhir: k.pendidikanAkhir,
    agama: k.agama,
    telpHp: k.telpHp,
    email: k.email,
    alamat: k.alamat,
    bagian: k.bagian,
    jabatan: k.jabatan,
    status: k.status,
    tmt: k.tmt,
    statusAktif: k.isActive ? 'Ya' : 'Tidak',
  }));
  return buildWorkbook('Karyawan', EXPORT_COLUMNS, data);
};

const exportKaryawanTemplate = () => {
  const sample = {
    nip: 'K0001',
    namaLengkap: 'Contoh Nama Karyawan',
    idFinger: '1234',
    tempatLahir: 'Jakarta',
    tanggalLahir: '1990-01-01',
    jenisKelamin: 'L',
    pendidikanAkhir: 'S1',
    agama: 'Islam',
    telpHp: '081234567890',
    email: 'contoh@email.com',
    alamat: 'Jl. Contoh No. 1',
    bagian: 'Administrasi Umum',
    jabatan: 'Staff',
    status: 'Tetap',
    tmt: '2020-01-01',
    statusAktif: 'Ya',
  };
  return buildWorkbook('Karyawan', EXPORT_COLUMNS, [sample]);
};

const importKaryawan = async (fileBase64, actorId) => {
  const rows = await parseWorkbookFromBase64(fileBase64);
  const errors = [];
  let successCount = 0;

  for (const { rowNumber, data } of rows) {
    const nip = cellString(data['NIP']);
    const namaLengkap = cellString(data['Nama Lengkap']);
    if (!nip || !namaLengkap) {
      errors.push({ row: rowNumber, message: 'NIP dan Nama Lengkap wajib diisi' });
      continue;
    }

    const jenisKelaminRaw = cellString(data['Jenis Kelamin']).toUpperCase();
    const jenisKelamin = ['L', 'P'].includes(jenisKelaminRaw) ? jenisKelaminRaw : null;

    const payload = {
      nip,
      namaLengkap,
      idFinger: cellString(data['ID-Finger']) || null,
      tempatLahir: cellString(data['Tempat Lahir']) || null,
      tanggalLahir: cellString(data['Tanggal Lahir']) || null,
      jenisKelamin,
      pendidikanAkhir: cellString(data['Pendidikan Akhir']) || null,
      agama: cellString(data['Agama']) || null,
      telpHp: cellString(data['No HP']) || null,
      email: cellString(data['Email']) || null,
      alamat: cellString(data['Alamat']) || null,
      bagian: cellString(data['Bagian']) || null,
      jabatan: cellString(data['Jabatan']) || null,
      status: cellString(data['Status Kepegawaian']) || null,
      tmt: cellString(data['TMT']) || null,
      isActive: cellBoolean(data['Status Aktif'], true),
    };

    try {
      const existing = await Karyawan.findOne({ where: { nip } });
      if (existing) {
        await existing.update({ ...payload, updatedBy: actorId });
      } else {
        await Karyawan.create({ ...payload, createdBy: actorId, updatedBy: actorId });
      }
      successCount += 1;
    } catch (err) {
      errors.push({ row: rowNumber, message: err.message });
    }
  }

  return { successCount, errorCount: errors.length, errors };
};

module.exports = {
  listKaryawan,
  getKaryawanById,
  createKaryawan,
  updateKaryawan,
  deleteKaryawan,
  getGenderSummary,
  exportKaryawan,
  exportKaryawanTemplate,
  importKaryawan,
};
