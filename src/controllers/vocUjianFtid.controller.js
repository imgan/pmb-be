const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const vocUjianFtidService = require('../services/vocUjianFtid.service');

const list = catchAsync(async (req, res) => {
  const { data, meta } = await vocUjianFtidService.listVocUjianFtid(req.query);
  sendResponse(res, 200, { message: 'Voc ujian FTID fetched', data, meta });
});

const bayar = catchAsync(async (req, res) => {
  const data = await vocUjianFtidService.bayarVocUjianFtid(req.params.dosenId, req.body.nominal, req.user.id);
  sendResponse(res, 200, { message: 'Pembayaran voc ujian berhasil disimpan', data });
});

module.exports = { list, bayar };
