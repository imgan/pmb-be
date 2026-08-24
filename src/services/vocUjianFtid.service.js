const { Op } = require('sequelize');
const { Dosen, VocUjianFtid } = require('../models');
const ApiError = require('../utils/ApiError');
const { getPagination, getPagingMeta } = require('../utils/pagination');
const { resolveOrder } = require('../utils/sorting');

const SORTABLE_COLUMNS = {
  nidn: ['nidn'],
  namaLengkap: ['namaLengkap'],
};

const listVocUjianFtid = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const where = { kelompokFakultas: 'FTID' };
  if (query.search) {
    where[Op.or] = [{ namaLengkap: { [Op.like]: `%${query.search}%` } }, { nidn: { [Op.like]: `%${query.search}%` } }];
  }

  const { rows, count } = await Dosen.findAndCountAll({
    where,
    attributes: ['id', 'nidn', 'namaLengkap'],
    include: [{ model: VocUjianFtid, as: 'vocUjianFtid', attributes: ['id', 'nominal', 'paidAt'], required: false }],
    limit,
    offset,
    order: resolveOrder(query, SORTABLE_COLUMNS, [['namaLengkap', 'ASC']]),
  });
  return { data: rows, meta: getPagingMeta(count, page, limit) };
};

const bayarVocUjianFtid = async (dosenId, nominal, actorId) => {
  const dosen = await Dosen.findOne({ where: { id: dosenId, kelompokFakultas: 'FTID' } });
  if (!dosen) throw new ApiError(404, 'Dosen FTID tidak ditemukan');

  const [voc] = await VocUjianFtid.findOrCreate({
    where: { dosenId },
    defaults: { dosenId, nominal, paidAt: new Date(), createdBy: actorId, updatedBy: actorId },
  });
  await voc.update({ nominal, paidAt: new Date(), updatedBy: actorId });
  return voc;
};

module.exports = { listVocUjianFtid, bayarVocUjianFtid };
