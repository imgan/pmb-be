const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const { Akun } = require('../models');
const jurnalService = require('../services/jurnal.service');

const listAkun = catchAsync(async (req, res) => {
  const data = await Akun.findAll({ where: { isActive: true }, order: [['kode', 'ASC']] });
  sendResponse(res, 200, { message: 'Chart of account fetched', data });
});

const bukuBesar = catchAsync(async (req, res) => {
  if (!req.query.akunId) throw new ApiError(400, 'akunId wajib diisi');
  const data = await jurnalService.listBukuBesar({
    akunId: req.query.akunId,
    startDate: req.query.startDate,
    endDate: req.query.endDate,
  });
  sendResponse(res, 200, { message: 'Buku besar fetched', data });
});

const neraca = catchAsync(async (req, res) => {
  const data = await jurnalService.getNeraca({ tanggal: req.query.tanggal });
  sendResponse(res, 200, { message: 'Neraca fetched', data });
});

module.exports = { listAkun, bukuBesar, neraca };
