const { Op } = require('sequelize');
const { Role } = require('../models');
const ApiError = require('../utils/ApiError');
const { getPagination, getPagingMeta } = require('../utils/pagination');
const { resolveOrder } = require('../utils/sorting');

const SORTABLE_COLUMNS = {
  name: ['name'],
  code: ['code'],
  description: ['description'],
  status: ['isActive'],
};

const listRoles = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const where = {};
  if (query.search) {
    where[Op.or] = [
      { name: { [Op.like]: `%${query.search}%` } },
      { code: { [Op.like]: `%${query.search}%` } },
    ];
  }

  const { rows, count } = await Role.findAndCountAll({
    where,
    limit,
    offset,
    order: resolveOrder(query, SORTABLE_COLUMNS),
  });
  return { data: rows, meta: getPagingMeta(count, page, limit) };
};

const getRoleById = async (id) => {
  const role = await Role.findByPk(id);
  if (!role) throw new ApiError(404, 'Role not found');
  return role;
};

const createRole = (payload, actorId) => Role.create({ ...payload, createdBy: actorId, updatedBy: actorId });

const updateRole = async (id, payload, actorId) => {
  const role = await getRoleById(id);
  await role.update({ ...payload, updatedBy: actorId });
  return role;
};

const deleteRole = async (id) => {
  const role = await getRoleById(id);
  await role.destroy();
};

module.exports = { listRoles, getRoleById, createRole, updateRole, deleteRole };
