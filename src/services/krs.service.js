const { Op } = require('sequelize');
const { Krs, KrsDetail, Mahasiswa, TahunAjaran, JadwalKuliah, Dosen, MataKuliah, Jurusan } = require('../models');
const ApiError = require('../utils/ApiError');
const { getPagination, getPagingMeta } = require('../utils/pagination');

const detailInclude = {
  model: KrsDetail,
  as: 'detailList',
  include: [
    {
      model: JadwalKuliah,
      as: 'kelasKuliah',
      include: [
        { model: Dosen, as: 'dosenKordinator' },
        { model: MataKuliah, as: 'mataKuliah' },
      ],
    },
  ],
};

const includeRelations = [
  { model: Mahasiswa, as: 'mahasiswa', include: [{ model: Jurusan, as: 'jurusan' }] },
  { model: TahunAjaran, as: 'tahunAjaran' },
  detailInclude,
];

const withTotalSks = (krs) => {
  const json = krs.toJSON ? krs.toJSON() : krs;
  const totalSks = (json.detailList ?? []).reduce((sum, d) => sum + (d.kelasKuliah?.sks ?? 0), 0);
  return { ...json, totalSks };
};

const listKrs = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const where = {};
  if (query.mahasiswaId) where.mahasiswaId = query.mahasiswaId;
  if (query.tahunAjaranId) where.tahunAjaranId = query.tahunAjaranId;
  if (query.semester) where.semester = query.semester;
  if (query.status) where.status = query.status;

  // Pencarian NIM/nama mahasiswa (dipakai halaman Monitoring FRS) butuh JOIN wajib
  // (required: true) ke Mahasiswa supaya where-clause di include benar-benar memfilter,
  // beda dari includeRelations default yang LEFT JOIN.
  const include = query.nim || query.namaMahasiswa
    ? includeRelations.map((rel) =>
        rel.as === 'mahasiswa'
          ? {
              ...rel,
              required: true,
              where: {
                ...(query.nim ? { nim: { [Op.like]: `%${query.nim}%` } } : {}),
                ...(query.namaMahasiswa ? { namaLengkap: { [Op.like]: `%${query.namaMahasiswa}%` } } : {}),
              },
            }
          : rel
      )
    : includeRelations;

  const { rows, count } = await Krs.findAndCountAll({
    where,
    include,
    limit,
    offset,
    order: [['id', 'DESC']],
    distinct: true,
  });

  return { data: rows.map(withTotalSks), meta: getPagingMeta(count, page, limit) };
};

const getKrsById = async (id) => {
  const krs = await Krs.findByPk(id, { include: includeRelations });
  if (!krs) throw new ApiError(404, 'KRS not found');
  return withTotalSks(krs);
};

const setDetails = async (krsId, jadwalKuliahIds) => {
  await KrsDetail.destroy({ where: { krsId } });
  if (jadwalKuliahIds.length) {
    await KrsDetail.bulkCreate(jadwalKuliahIds.map((jadwalKuliahId) => ({ krsId, jadwalKuliahId })));
  }
};

const createKrs = async (payload, actorId) => {
  const { jadwalKuliahIds = [], ...rest } = payload;

  const existing = await Krs.findOne({
    where: { mahasiswaId: rest.mahasiswaId, semester: rest.semester, tahunAjaranId: rest.tahunAjaranId },
  });
  if (existing) throw new ApiError(400, 'KRS untuk mahasiswa, semester, dan tahun ajaran ini sudah ada');

  const krs = await Krs.create({ ...rest, createdBy: actorId, updatedBy: actorId });
  if (jadwalKuliahIds.length) {
    await setDetails(krs.id, jadwalKuliahIds);
  }
  return getKrsById(krs.id);
};

const updateKrs = async (id, payload, actorId) => {
  const krs = await Krs.findByPk(id);
  if (!krs) throw new ApiError(404, 'KRS not found');

  const { jadwalKuliahIds, ...rest } = payload;
  await krs.update({ ...rest, updatedBy: actorId });
  if (jadwalKuliahIds !== undefined) {
    await setDetails(id, jadwalKuliahIds);
  }
  return getKrsById(id);
};

const deleteKrs = async (id) => {
  const krs = await Krs.findByPk(id);
  if (!krs) throw new ApiError(404, 'KRS not found');
  await krs.destroy();
};

module.exports = { listKrs, getKrsById, createKrs, updateKrs, deleteKrs };
