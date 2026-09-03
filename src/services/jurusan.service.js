const { Op } = require('sequelize');
const { Jurusan, GolonganKelas } = require('../models');
const ApiError = require('../utils/ApiError');
const { getPagination, getPagingMeta } = require('../utils/pagination');
const { resolveOrder } = require('../utils/sorting');
const { buildWorkbook, parseWorkbookFromBase64, cellString } = require('../utils/excel');

const EXPORT_COLUMNS = [
  { header: 'Nama Jurusan', key: 'namaJurusan', width: 30 },
  { header: 'Kode Prodi', key: 'kodeProdi', width: 15 },
  { header: 'Golongan Kelas', key: 'golonganKelas', width: 20 },
  { header: 'Jenjang Pendidikan', key: 'jenjangPendidikan', width: 20 },
  { header: 'Fakultas', key: 'namaFakultas', width: 30 },
  { header: 'Gelar Singkat', key: 'gelarSingkat', width: 15 },
  { header: 'Gelar Lengkap', key: 'gelarLengkap', width: 30 },
  { header: 'Prospek Karir', key: 'prospekKarir', width: 40 },
];

const SORTABLE_COLUMNS = {
  namaJurusan: ['namaJurusan'],
  golonganKelas: [{ model: GolonganKelas, as: 'golonganKelas' }, 'namaKelas'],
};

const ensureGolonganKelasExists = async (golonganKelasId) => {
  const golonganKelas = await GolonganKelas.findByPk(golonganKelasId);
  if (!golonganKelas) throw new ApiError(400, 'Golongan kelas not found');
};

const listJurusan = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const where = {};
  if (query.search) {
    where.namaJurusan = { [Op.like]: `%${query.search}%` };
  }
  if (query.golonganKelasId) {
    where.golonganKelasId = query.golonganKelasId;
  }

  const { rows, count } = await Jurusan.findAndCountAll({
    where,
    include: [{ model: GolonganKelas, as: 'golonganKelas' }],
    limit,
    offset,
    order: resolveOrder(query, SORTABLE_COLUMNS),
    subQuery: false,
    distinct: true,
  });

  return { data: rows, meta: getPagingMeta(count, page, limit) };
};

const getJurusanById = async (id) => {
  const jurusan = await Jurusan.findByPk(id, { include: [{ model: GolonganKelas, as: 'golonganKelas' }] });
  if (!jurusan) throw new ApiError(404, 'Jurusan not found');
  return jurusan;
};

const createJurusan = async (payload, actorId) => {
  await ensureGolonganKelasExists(payload.golonganKelasId);
  const jurusan = await Jurusan.create({ ...payload, createdBy: actorId, updatedBy: actorId });
  return getJurusanById(jurusan.id);
};

const updateJurusan = async (id, payload, actorId) => {
  const jurusan = await Jurusan.findByPk(id);
  if (!jurusan) throw new ApiError(404, 'Jurusan not found');

  if (payload.golonganKelasId) {
    await ensureGolonganKelasExists(payload.golonganKelasId);
  }

  await jurusan.update({ ...payload, updatedBy: actorId });
  return getJurusanById(id);
};

const deleteJurusan = async (id, actorId) => {
  const jurusan = await Jurusan.findByPk(id);
  if (!jurusan) throw new ApiError(404, 'Jurusan not found');
  await jurusan.update({ isDelete: true, updatedBy: actorId });
};

const exportJurusan = async () => {
  const rows = await Jurusan.findAll({
    include: [{ model: GolonganKelas, as: 'golonganKelas' }],
    order: [['namaJurusan', 'ASC']],
  });
  const data = rows.map((j) => ({
    namaJurusan: j.namaJurusan,
    kodeProdi: j.kodeProdi ?? '',
    golonganKelas: j.golonganKelas?.namaKelas ?? '',
    jenjangPendidikan: j.jenjangPendidikan ?? '',
    namaFakultas: j.namaFakultas ?? '',
    gelarSingkat: j.gelarSingkat ?? '',
    gelarLengkap: j.gelarLengkap ?? '',
    prospekKarir: j.prospekKarir ?? '',
  }));
  return buildWorkbook('Jurusan', EXPORT_COLUMNS, data);
};

const exportJurusanTemplate = () => {
  const sample = {
    namaJurusan: 'Contoh Nama Jurusan/Prodi',
    kodeProdi: '57201',
    golonganKelas: 'Nama Golongan Kelas (sesuai master data)',
    jenjangPendidikan: 'Diploma Tiga',
    namaFakultas: 'Fakultas Contoh',
    gelarSingkat: 'A.Md.Kom.',
    gelarLengkap: 'Ahli Madya Komputer',
    prospekKarir: 'Satu prospek karir per baris',
  };
  return buildWorkbook('Jurusan', EXPORT_COLUMNS, [sample]);
};

/**
 * Beda dengan import mahasiswa (update-only): import jurusan boleh MEMBUAT baru sekaligus
 * mengubah yang sudah ada (dicocokkan lewat Nama Jurusan) — dipakai untuk migrasi awal daftar
 * prodi dari sistem kampus lama yang belum ada di master data ini sama sekali.
 */
const importJurusan = async (fileBase64, actorId) => {
  const rows = await parseWorkbookFromBase64(fileBase64);
  const errors = [];
  let successCount = 0;

  for (const { rowNumber, data } of rows) {
    const namaJurusan = cellString(data['Nama Jurusan']);
    if (!namaJurusan) {
      errors.push({ row: rowNumber, message: 'Nama Jurusan wajib diisi' });
      continue;
    }

    const golonganNama = cellString(data['Golongan Kelas']);
    if (!golonganNama) {
      errors.push({ row: rowNumber, message: 'Golongan Kelas wajib diisi' });
      continue;
    }
    const golongan = await GolonganKelas.findOne({ where: { namaKelas: golonganNama } });
    if (!golongan) {
      errors.push({ row: rowNumber, message: `Golongan Kelas "${golonganNama}" tidak ditemukan` });
      continue;
    }

    const payload = {
      namaJurusan,
      golonganKelasId: golongan.id,
      kodeProdi: cellString(data['Kode Prodi']) || null,
      jenjangPendidikan: cellString(data['Jenjang Pendidikan']) || null,
      namaFakultas: cellString(data['Fakultas']) || null,
      gelarSingkat: cellString(data['Gelar Singkat']) || null,
      gelarLengkap: cellString(data['Gelar Lengkap']) || null,
      prospekKarir: cellString(data['Prospek Karir']) || null,
      updatedBy: actorId,
    };

    try {
      const existing = await Jurusan.findOne({ where: { namaJurusan } });
      if (existing) {
        await existing.update(payload);
      } else {
        await Jurusan.create({ ...payload, createdBy: actorId });
      }
      successCount += 1;
    } catch (err) {
      errors.push({ row: rowNumber, message: err.message });
    }
  }

  return { successCount, errorCount: errors.length, errors };
};

module.exports = {
  listJurusan,
  getJurusanById,
  createJurusan,
  updateJurusan,
  deleteJurusan,
  exportJurusan,
  exportJurusanTemplate,
  importJurusan,
};
