const { Op } = require('sequelize');
const { Mahasiswa, MahasiswaBiodata, Jurusan, Peserta, PesertaBiodata } = require('../models');
const { getPagination, getPagingMeta } = require('../utils/pagination');
const { resolveOrder } = require('../utils/sorting');

const SORTABLE_COLUMNS = {
  nim: ['nim'],
  namaLengkap: ['namaLengkap'],
};

const listBiodataMahasiswa = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const where = {};
  if (query.nim) where.nim = { [Op.like]: `%${query.nim}%` };
  if (query.search) {
    where[Op.or] = [{ nim: { [Op.like]: `%${query.search}%` } }, { namaLengkap: { [Op.like]: `%${query.search}%` } }];
  }

  const { rows, count } = await Mahasiswa.findAndCountAll({
    where,
    include: [
      { model: MahasiswaBiodata, as: 'biodata', attributes: ['hp', 'kelas'], required: false },
      { model: Jurusan, as: 'jurusan', attributes: ['id', 'namaJurusan', 'kodeProdi'], required: false },
      {
        model: Peserta,
        as: 'peserta',
        attributes: ['id'],
        required: false,
        include: [{ model: PesertaBiodata, as: 'biodata', attributes: ['jenisKelamin'], required: false }],
      },
    ],
    limit,
    offset,
    order: resolveOrder(query, SORTABLE_COLUMNS, [['namaLengkap', 'ASC']]),
    subQuery: false,
    distinct: true,
  });
  return { data: rows, meta: getPagingMeta(count, page, limit) };
};

module.exports = { listBiodataMahasiswa };
