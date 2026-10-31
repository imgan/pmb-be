const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const { sendWorkbook } = require('../utils/excel');
const feeder = require('../services/feeder');

const meta = catchAsync(async (req, res) => {
  sendResponse(res, 200, { message: 'Feeder meta fetched', data: await feeder.getMeta(req.params.entity) });
});

const list = catchAsync(async (req, res) => {
  const { data, meta: paging } = await feeder.list(req.params.entity, req.query);
  sendResponse(res, 200, { message: 'Feeder data fetched', data, meta: paging });
});

const exportExcel = catchAsync(async (req, res) => {
  const workbook = await feeder.exportWorkbook(req.params.entity, req.query);
  await sendWorkbook(res, workbook, `FEEDER_${req.params.entity.toUpperCase().replace(/-/g, '_')}.xlsx`);
});

const getRecord = catchAsync(async (req, res) => {
  const data = await feeder.getRecord(req.params.entity, req.params.id);
  sendResponse(res, 200, { message: 'Feeder record fetched', data });
});

const create = catchAsync(async (req, res) => {
  const data = await feeder.createRecord(req.params.entity, req.body, req.user.id);
  sendResponse(res, 201, { message: 'Data berhasil ditambahkan', data });
});

const update = catchAsync(async (req, res) => {
  const data = await feeder.updateRecord(req.params.entity, req.params.id, req.body, req.user.id);
  sendResponse(res, 200, { message: 'Data berhasil diperbarui', data });
});

const remove = catchAsync(async (req, res) => {
  await feeder.deleteRecord(req.params.entity, req.params.id);
  sendResponse(res, 200, { message: 'Data berhasil dihapus' });
});

const runAction = catchAsync(async (req, res) => {
  const data = await feeder.runAction(req.params.entity, req.params.action, req.user.id);
  sendResponse(res, 200, { message: data.message, data });
});

const lookup = catchAsync(async (req, res) => {
  const data = await feeder.lookup(req.params.type, req.query.search);
  sendResponse(res, 200, { message: 'Lookup fetched', data });
});

module.exports = { meta, list, exportExcel, getRecord, create, update, remove, runAction, lookup };
