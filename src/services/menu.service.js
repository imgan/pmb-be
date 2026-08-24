const { Op } = require('sequelize');
const { Menu } = require('../models');
const ApiError = require('../utils/ApiError');
const { getPagination, getPagingMeta } = require('../utils/pagination');
const { resolveOrder } = require('../utils/sorting');

const SORTABLE_COLUMNS = {
  name: ['name'],
  code: ['code'],
  path: ['path'],
  orderNumber: ['orderNumber'],
  visibility: ['isPublic'],
  status: ['isActive'],
};

const listMenus = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const where = {};
  if (query.search) {
    where[Op.or] = [
      { name: { [Op.like]: `%${query.search}%` } },
      { code: { [Op.like]: `%${query.search}%` } },
    ];
  }

  const { rows, count } = await Menu.findAndCountAll({
    where,
    limit,
    offset,
    order: resolveOrder(query, SORTABLE_COLUMNS, [['orderNumber', 'ASC']]),
  });
  return { data: rows, meta: getPagingMeta(count, page, limit) };
};

const buildTree = (menus) => {
  const byId = new Map(menus.map((m) => [m.id, { ...m.toJSON(), children: [] }]));
  const tree = [];

  byId.forEach((menu) => {
    if (menu.parentId && byId.has(menu.parentId)) {
      byId.get(menu.parentId).children.push(menu);
    } else {
      tree.push(menu);
    }
  });

  return tree;
};

const getMenuTree = async () => {
  const menus = await Menu.findAll({ where: { isActive: true, isPublic: false }, order: [['orderNumber', 'ASC']] });
  return buildTree(menus);
};

const getPublicMenus = async () => {
  return Menu.findAll({ where: { isActive: true, isPublic: true }, order: [['orderNumber', 'ASC']] });
};

const getMenuById = async (id) => {
  const menu = await Menu.findByPk(id);
  if (!menu) throw new ApiError(404, 'Menu not found');
  return menu;
};

const createMenu = (payload, actorId) => Menu.create({ ...payload, createdBy: actorId, updatedBy: actorId });

const updateMenu = async (id, payload, actorId) => {
  const menu = await getMenuById(id);
  await menu.update({ ...payload, updatedBy: actorId });
  return menu;
};

const deleteMenu = async (id) => {
  const menu = await getMenuById(id);
  await menu.destroy();
};

module.exports = { listMenus, getMenuTree, getPublicMenus, getMenuById, createMenu, updateMenu, deleteMenu };
