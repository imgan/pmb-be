const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const auditLogService = require('../services/auditLog.service');

const list = catchAsync(async (req, res) => {
  const { data, meta } = await auditLogService.listAuditLogs(req.query);
  sendResponse(res, 200, { message: 'Audit logs fetched', data, meta });
});

const modules = catchAsync(async (req, res) => {
  const data = await auditLogService.listModules();
  sendResponse(res, 200, { message: 'Modules fetched', data });
});

module.exports = { list, modules };
