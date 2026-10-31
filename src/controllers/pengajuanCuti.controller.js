const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const service = require('../services/pengajuanCuti.service');

const sendPdf = (res, { doc, filename }) => {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
  doc.pipe(res);
};

// ---- Portal mahasiswa ----
const getForm = catchAsync(async (req, res) => {
  const data = await service.getFormCuti(req.mahasiswa.id);
  sendResponse(res, 200, { message: 'Form pengajuan cuti fetched', data });
});

const ajukan = catchAsync(async (req, res) => {
  const data = await service.ajukanCuti(req.mahasiswa.id, req.body);
  sendResponse(res, 201, { message: 'Pengajuan cuti dikirim', data });
});

const batalkan = catchAsync(async (req, res) => {
  await service.batalkanCuti(req.mahasiswa.id, req.params.id);
  sendResponse(res, 200, { message: 'Pengajuan cuti dibatalkan' });
});

const pdfMahasiswa = catchAsync(async (req, res) => {
  sendPdf(res, await service.getPengajuanCutiPdf(req.params.id, req.mahasiswa.id));
});

// ---- Prodi ----
const list = catchAsync(async (req, res) => {
  const { data, meta } = await service.listPengajuan(req.query);
  sendResponse(res, 200, { message: 'Pengajuan cuti fetched', data, meta });
});

const verifikasi = catchAsync(async (req, res) => {
  const data = await service.verifikasiPengajuan(req.params.id, req.body, req.user.id);
  sendResponse(res, 200, { message: 'Pengajuan cuti diverifikasi', data });
});

const pdf = catchAsync(async (req, res) => {
  sendPdf(res, await service.getPengajuanCutiPdf(req.params.id));
});

module.exports = { getForm, ajukan, batalkan, pdfMahasiswa, list, verifikasi, pdf };
