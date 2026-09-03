const { Op } = require('sequelize');
const { Dosen, HonorUjianPembayaran } = require('../models');
const ApiError = require('../utils/ApiError');
const { getPagination, getPagingMeta } = require('../utils/pagination');
const { resolveOrder } = require('../utils/sorting');

const SORTABLE_COLUMNS = {
  namaLengkap: ['namaLengkap'],
  nidn: ['nidn'],
};

const listDosenForPembayaran = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const where = { isActive: true };
  if (query.search) {
    where[Op.or] = [
      { namaLengkap: { [Op.like]: `%${query.search}%` } },
      { nidn: { [Op.like]: `%${query.search}%` } },
    ];
  }

  const { rows, count } = await Dosen.findAndCountAll({
    where,
    limit,
    offset,
    order: resolveOrder(query, SORTABLE_COLUMNS, [['namaLengkap', 'ASC']]),
    include: [
      {
        model: HonorUjianPembayaran,
        as: 'honorUjianPembayaranList',
        separate: true,
        order: [['tanggalBayar', 'DESC']],
        limit: 1,
      },
    ],
  });

  const data = rows.map((row) => {
    const plain = row.toJSON();
    const lastPayment = plain.honorUjianPembayaranList?.[0] ?? null;
    delete plain.honorUjianPembayaranList;
    return { ...plain, lastPayment };
  });

  return { data, meta: getPagingMeta(count, page, limit) };
};

const createPembayaran = async (payload, actorId) => {
  const dosen = await Dosen.findByPk(payload.dosenId);
  if (!dosen) throw new ApiError(404, 'Dosen tidak ditemukan');

  const item = await HonorUjianPembayaran.create({
    dosenId: payload.dosenId,
    nominal: payload.nominal,
    tanggalBayar: new Date(),
    createdBy: actorId,
    updatedBy: actorId,
  });
  return item;
};

module.exports = { listDosenForPembayaran, createPembayaran };
