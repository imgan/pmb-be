const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const permissionService = require('../services/permission.service');

const getByRole = catchAsync(async (req, res) => {
  const data = await permissionService.getPermissionsByRole(req.params.roleId);
  sendResponse(res, 200, { message: 'Permissions fetched', data });
});

const assign = catchAsync(async (req, res) => {
  const data = await permissionService.assignPermissions(req.params.roleId, req.body.permissions, req.user.id);
  sendResponse(res, 200, { message: 'Permissions updated', data });
});

module.exports = { getByRole, assign };
