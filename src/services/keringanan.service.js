const { Op } = require('sequelize');
const { Keringanan, Mahasiswa } = require('../models');
const ApiError = require('../utils/ApiError');
const { getPagination, getPagingMeta } = require('../utils/pagination');
const { resolveOrder } = require('../utils/sorting');

/**
 * `required: false` di-set eksplisit — satu-satunya include di sini memang wajib (mahasiswaId
 * NOT NULL), tapi tetap ditulis eksplisit mengikuti konvensi di service lain agar konsisten dan
 * tidak bergantung pada default Sequelize saat include lain ditambahkan di kemudian hari.
 */
const includeRelations = [{ model: Mahasiswa, as: 'mahasiswa', required: false }];

const SORTABLE_COLUMNS = {
  tanggal: ['tanggal'],
  jumlahBayar: ['jumlahBayar'],
  status: ['status'],
};

const listKeringanan = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const where = {};
  if (query.status) where.status = query.status;

  const include = query.search
    ? [
        {
          ...includeRelations[0],
          required: true,
          where: {
            [Op.or]: [
              { nim: { [Op.like]: `%${query.search}%` } },
              { namaLengkap: { [Op.like]: `%${query.search}%` } },
            ],
          },
        },
      ]
    : includeRelations;

  const { rows, count } = await Keringanan.findAndCountAll({
    where,
    include,
    limit,
    offset,
    order: resolveOrder(query, SORTABLE_COLUMNS, [['id', 'DESC']]),
    subQuery: false,
    distinct: true,
  });
  return { data: rows, meta: getPagingMeta(count, page, limit) };
};

const getKeringananById = async (id) => {
  const item = await Keringanan.findByPk(id, { include: includeRelations });
  if (!item) throw new ApiError(404, 'Data keringanan tidak ditemukan');
  return item;
};

const resolveMahasiswaId = async (nim) => {
  const mahasiswa = await Mahasiswa.findOne({ where: { nim } });
  if (!mahasiswa) throw new ApiError(404, `Mahasiswa dengan NIM "${nim}" tidak ditemukan`);
  return mahasiswa.id;
};

const createKeringanan = async (payload, actorId) => {
  const { nim, ...rest } = payload;
  const mahasiswaId = await resolveMahasiswaId(nim);
  const item = await Keringanan.create({ ...rest, mahasiswaId, createdBy: actorId, updatedBy: actorId });
  return getKeringananById(item.id);
};

const updateKeringanan = async (id, payload, actorId) => {
  const item = await getKeringananById(id);
  const { nim, ...rest } = payload;
  const updates = { ...rest, updatedBy: actorId };
  if (nim) updates.mahasiswaId = await resolveMahasiswaId(nim);
  await item.update(updates);
  return getKeringananById(id);
};

const deleteKeringanan = async (id) => {
  const item = await getKeringananById(id);
  await item.destroy();
};

module.exports = { listKeringanan, getKeringananById, createKeringanan, updateKeringanan, deleteKeringanan };
