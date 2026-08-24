const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const { sendWorkbook } = require('../utils/excel');
const syncFingerLogService = require('../services/syncFingerLog.service');

const list = catchAsync(async (req, res) => {
  const { data, meta } = await syncFingerLogService.listLog(req.mesin, req.query);
  sendResponse(res, 200, { message: 'Sync finger log fetched', data, meta });
});

const template = catchAsync(async (req, res) => {
  const workbook = syncFingerLogService.exportTemplate();
  await sendWorkbook(res, workbook, `template-sync-finger-${req.mesin.toLowerCase()}.xlsx`);
});

const pull = catchAsync(async (req, res) => {
  const data = await syncFingerLogService.pullFromMachine(req.mesin, req.body.file, req.user.id);
  sendResponse(res, 200, { message: 'Data berhasil ditarik dari mesin', data });
});

const insert = catchAsync(async (req, res) => {
  const data = await syncFingerLogService.insertToDatabase(req.mesin, req.user.id);
  sendResponse(res, 200, { message: 'Data berhasil dimasukkan ke database', data });
});

module.exports = { list, template, pull, insert };
