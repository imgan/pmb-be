const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const userService = require('../services/user.service');

const list = catchAsync(async (req, res) => {
  const { data, meta } = await userService.listUsers(req.query);
  sendResponse(res, 200, { message: 'Users fetched', data, meta });
});

const detail = catchAsync(async (req, res) => {
  const data = await userService.getUserById(req.params.id);
  sendResponse(res, 200, { message: 'User fetched', data });
});

const create = catchAsync(async (req, res) => {
  const data = await userService.createUser(req.body, req.user.id);
  sendResponse(res, 201, { message: 'User created', data });
});

const update = catchAsync(async (req, res) => {
  const data = await userService.updateUser(req.params.id, req.body, req.user.id);
  sendResponse(res, 200, { message: 'User updated', data });
});

const remove = catchAsync(async (req, res) => {
  await userService.deleteUser(req.params.id);
  sendResponse(res, 200, { message: 'User deleted' });
});

module.exports = { list, detail, create, update, remove };
