const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const menuService = require('../services/menu.service');

const list = catchAsync(async (req, res) => {
  const { data, meta } = await menuService.listMenus(req.query);
  sendResponse(res, 200, { message: 'Menus fetched', data, meta });
});

const tree = catchAsync(async (req, res) => {
  const data = await menuService.getMenuTree();
  sendResponse(res, 200, { message: 'Menu tree fetched', data });
});

const detail = catchAsync(async (req, res) => {
  const data = await menuService.getMenuById(req.params.id);
  sendResponse(res, 200, { message: 'Menu fetched', data });
});

const create = catchAsync(async (req, res) => {
  const data = await menuService.createMenu(req.body, req.user.id);
  sendResponse(res, 201, { message: 'Menu created', data });
});

const update = catchAsync(async (req, res) => {
  const data = await menuService.updateMenu(req.params.id, req.body, req.user.id);
  sendResponse(res, 200, { message: 'Menu updated', data });
});

const remove = catchAsync(async (req, res) => {
  await menuService.deleteMenu(req.params.id);
  sendResponse(res, 200, { message: 'Menu deleted' });
});

module.exports = { list, tree, detail, create, update, remove };
