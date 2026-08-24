const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const suratKeteranganService = require('../services/suratKeterangan.service');
const { buildSuratPdf } = require('../services/suratKeteranganPdf.service');

const list = catchAsync(async (req, res) => {
  const { data, meta } = await suratKeteranganService.listSurat(req.query);
  sendResponse(res, 200, { message: 'Surat keterangan fetched', data, meta });
});

const detail = catchAsync(async (req, res) => {
  const data = await suratKeteranganService.getSuratById(req.params.id);
  sendResponse(res, 200, { message: 'Surat keterangan fetched', data });
});

const create = catchAsync(async (req, res) => {
  const data = await suratKeteranganService.createSurat(req.body, req.user.id);
  sendResponse(res, 201, { message: 'Surat keterangan created', data });
});

const update = catchAsync(async (req, res) => {
  const data = await suratKeteranganService.updateSurat(req.params.id, req.body, req.user.id);
  sendResponse(res, 200, { message: 'Surat keterangan updated', data });
});

const remove = catchAsync(async (req, res) => {
  await suratKeteranganService.deleteSurat(req.params.id);
  sendResponse(res, 200, { message: 'Surat keterangan deleted' });
});

const cetakData = catchAsync(async (req, res) => {
  const data = await suratKeteranganService.getCetakData(req.params.id);
  sendResponse(res, 200, { message: 'Data cetak surat keterangan fetched', data });
});

const cetakPdf = catchAsync(async (req, res) => {
  const data = await suratKeteranganService.getCetakData(req.params.id);
  const doc = buildSuratPdf(data);
  const filename = `surat-keterangan-${data.mahasiswa.nim}.pdf`;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
  doc.pipe(res);
});

module.exports = { list, detail, create, update, remove, cetakData, cetakPdf };
