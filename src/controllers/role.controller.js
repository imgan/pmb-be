const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const roleService = require('../services/role.service');

const list = catchAsync(async (req, res) => {
  const { data, meta } = await roleService.listRoles(req.query);
  sendResponse(res, 200, { message: 'Roles fetched', data, meta });
});

const detail = catchAsync(async (req, res) => {
  const data = await roleService.getRoleById(req.params.id);
  sendResponse(res, 200, { message: 'Role fetched', data });
});

const create = catchAsync(async (req, res) => {
  const data = await roleService.createRole(req.body, req.user.id);
  sendResponse(res, 201, { message: 'Role created', data });
});

const update = catchAsync(async (req, res) => {
  const data = await roleService.updateRole(req.params.id, req.body, req.user.id);
  sendResponse(res, 200, { message: 'Role updated', data });
});

const remove = catchAsync(async (req, res) => {
  await roleService.deleteRole(req.params.id);
  sendResponse(res, 200, { message: 'Role deleted' });
});

module.exports = { list, detail, create, update, remove };
