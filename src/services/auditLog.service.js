const { Op } = require('sequelize');
const { AuditLog } = require('../models');
const { getPagination, getPagingMeta } = require('../utils/pagination');
const { resolveOrder } = require('../utils/sorting');

const SORTABLE_COLUMNS = {
  createdAt: ['createdAt'],
  actorName: ['actorName'],
  module: ['module'],
  action: ['action'],
  description: ['description'],
  statusCode: ['statusCode'],
};

const listAuditLogs = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const where = {};

  if (query.search) {
    where[Op.or] = [
      { actorName: { [Op.like]: `%${query.search}%` } },
      { actorEmail: { [Op.like]: `%${query.search}%` } },
      { description: { [Op.like]: `%${query.search}%` } },
      { path: { [Op.like]: `%${query.search}%` } },
    ];
  }
  if (query.module) where.module = query.module;
  if (query.action) where.action = query.action;
  if (query.actorType) where.actorType = query.actorType;
  if (query.dateFrom || query.dateTo) {
    where.createdAt = {};
    if (query.dateFrom) where.createdAt[Op.gte] = new Date(`${query.dateFrom}T00:00:00`);
    if (query.dateTo) where.createdAt[Op.lte] = new Date(`${query.dateTo}T23:59:59`);
  }

  const { rows, count } = await AuditLog.findAndCountAll({
    where,
    limit,
    offset,
    order: resolveOrder(query, SORTABLE_COLUMNS),
  });

  return { data: rows, meta: getPagingMeta(count, page, limit) };
};

const listModules = async () => {
  const rows = await AuditLog.findAll({
    attributes: ['module'],
    group: ['module'],
    order: [['module', 'ASC']],
  });
  return rows.map((r) => r.module);
};

module.exports = { listAuditLogs, listModules };
