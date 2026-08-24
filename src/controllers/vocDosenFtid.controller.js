const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const vocDosenFtidService = require('../services/vocDosenFtid.service');
const { buildVocDosenFtidPdf } = require('../services/vocDosenFtidPdf.service');
const kampusService = require('../services/kampus.service');

const list = catchAsync(async (req, res) => {
  const { data, meta } = await vocDosenFtidService.listVocDosenFtid(req.query);
  sendResponse(res, 200, { message: 'Voc dosen FTID fetched', data, meta });
});

const detail = catchAsync(async (req, res) => {
  const data = await vocDosenFtidService.getDosenDetail(req.params.dosenId);
  sendResponse(res, 200, { message: 'Voc dosen FTID detail fetched', data });
});

const updateJadwal = catchAsync(async (req, res) => {
  const data = await vocDosenFtidService.upsertVocUjianDosen(req.params.jadwalKuliahId, req.body, req.user.id);
  sendResponse(res, 200, { message: 'Data voc ujian dosen updated', data });
});

const cetakPdf = catchAsync(async (req, res) => {
  const [data, kampus] = await Promise.all([
    vocDosenFtidService.getVoucherData(req.params.dosenId),
    kampusService.getKampus(),
  ]);
  const doc = buildVocDosenFtidPdf(data, kampus);
  const filename = `voucher-uas-${data.dosen.nidn}.pdf`;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
  doc.pipe(res);
});

module.exports = { list, detail, updateJadwal, cetakPdf };
