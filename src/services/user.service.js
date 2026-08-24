const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { User, Role } = require('../models');
const ApiError = require('../utils/ApiError');
const { getPagination, getPagingMeta } = require('../utils/pagination');
const { resolveOrder } = require('../utils/sorting');

const SORTABLE_COLUMNS = {
  name: ['name'],
  username: ['username'],
  email: ['email'],
  role: [{ model: Role, as: 'role' }, 'name'],
  status: ['isActive'],
};

const listUsers = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const where = {};
  if (query.search) {
    where[Op.or] = [
      { name: { [Op.like]: `%${query.search}%` } },
      { username: { [Op.like]: `%${query.search}%` } },
      { email: { [Op.like]: `%${query.search}%` } },
    ];
  }

  const { rows, count } = await User.findAndCountAll({
    where,
    include: [{ model: Role, as: 'role' }],
    limit,
    offset,
    order: resolveOrder(query, SORTABLE_COLUMNS),
    subQuery: false,
    distinct: true,
  });

  return { data: rows, meta: getPagingMeta(count, page, limit) };
};

const getUserById = async (id) => {
  const user = await User.findByPk(id, { include: [{ model: Role, as: 'role' }] });
  if (!user) throw new ApiError(404, 'User not found');
  return user;
};

const createUser = async (payload, actorId) => {
  const existing = await User.findOne({ where: { [Op.or]: [{ username: payload.username }, { email: payload.email }] } });
  if (existing) throw new ApiError(409, 'Username or email already in use');

  const hashed = await bcrypt.hash(payload.password, 10);
  const user = await User.create({ ...payload, password: hashed, createdBy: actorId, updatedBy: actorId });
  return getUserById(user.id);
};

const updateUser = async (id, payload, actorId) => {
  const user = await User.findByPk(id);
  if (!user) throw new ApiError(404, 'User not found');

  if (payload.password) {
    payload.password = await bcrypt.hash(payload.password, 10);
  }

  await user.update({ ...payload, updatedBy: actorId });
  return getUserById(id);
};

const deleteUser = async (id) => {
  const user = await User.findByPk(id);
  if (!user) throw new ApiError(404, 'User not found');
  await user.destroy();
};

module.exports = { listUsers, getUserById, createUser, updateUser, deleteUser };
