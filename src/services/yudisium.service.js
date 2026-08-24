const { Op } = require('sequelize');
const { Yudisium, Mahasiswa, MahasiswaBiodata, Jurusan, Dosen } = require('../models');
const ApiError = require('../utils/ApiError');
const { getPagination, getPagingMeta } = require('../utils/pagination');
const { resolveOrder } = require('../utils/sorting');

const includeRelations = [
  {
    model: Mahasiswa,
    as: 'mahasiswa',
    include: [
      { model: Jurusan, as: 'jurusan' },
      { model: MahasiswaBiodata, as: 'biodata' },
    ],
  },
  { model: Dosen, as: 'pembimbing1' },
  { model: Dosen, as: 'pembimbing2' },
];

const SORTABLE_COLUMNS = {
  noSk: ['noSk'],
  tanggalSk: ['tanggalSk'],
  tanggalYudisium: ['tanggalYudisium'],
  pin: ['pin'],
  mahasiswa: [{ model: Mahasiswa, as: 'mahasiswa' }, 'namaLengkap'],
};

const listYudisium = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const where = {};

  const mahasiswaWhere = {};
  if (query.jurusanId) {
    mahasiswaWhere.jurusanId = query.jurusanId;
  }
  if (query.search) {
    mahasiswaWhere[Op.or] = [
      { nim: { [Op.like]: `%${query.search}%` } },
      { namaLengkap: { [Op.like]: `%${query.search}%` } },
    ];
  }

  const include = [
    {
      model: Mahasiswa,
      as: 'mahasiswa',
      where: Object.keys(mahasiswaWhere).length ? mahasiswaWhere : undefined,
      include: [
        { model: Jurusan, as: 'jurusan' },
        { model: MahasiswaBiodata, as: 'biodata' },
      ],
    },
    { model: Dosen, as: 'pembimbing1' },
    { model: Dosen, as: 'pembimbing2' },
  ];

  const { rows, count } = await Yudisium.findAndCountAll({
    where,
    include,
    limit,
    offset,
    order: resolveOrder(query, SORTABLE_COLUMNS, [['id', 'ASC']]),
    subQuery: false,
    distinct: true,
  });

  return { data: rows, meta: getPagingMeta(count, page, limit) };
};

const getYudisiumById = async (id) => {
  const item = await Yudisium.findByPk(id, { include: includeRelations });
  if (!item) throw new ApiError(404, 'Yudisium not found');
  return item;
};

const updateYudisium = async (id, payload, actorId) => {
  const item = await getYudisiumById(id);
  await item.update({ ...payload, updatedBy: actorId });
  return getYudisiumById(id);
};

module.exports = { listYudisium, getYudisiumById, updateYudisium };
