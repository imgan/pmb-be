const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const service = require('../services/tiketMahasiswa.service');

// ---- Petugas (modul SIM) ----

const list = catchAsync(async (req, res) => {
  const { data, meta } = await service.listTiket(req.query);
  const ringkasan = await service.ringkasanStatus();
  sendResponse(res, 200, { message: 'Tiket mahasiswa fetched', data, meta: { ...meta, ringkasan } });
});

const detail = catchAsync(async (req, res) => {
  const data = await service.getTiketById(req.params.id);
  sendResponse(res, 200, { message: 'Tiket mahasiswa fetched', data });
});

const tanggapi = catchAsync(async (req, res) => {
  const data = await service.tanggapiTiket(req.params.id, req.body, req.user.id);
  sendResponse(res, 200, { message: 'Tiket ditanggapi', data });
});

// ---- Portal mahasiswa ----

const listMilikSendiri = catchAsync(async (req, res) => {
  const data = await service.listTiketMahasiswa(req.mahasiswa.id);
  sendResponse(res, 200, { message: 'Tiket fetched', data });
});

const ajukan = catchAsync(async (req, res) => {
  const data = await service.createTiketMahasiswa(req.mahasiswa.id, req.body);
  sendResponse(res, 201, { message: `Tiket ${data.nomorTiket} berhasil diajukan`, data });
});

const batalkan = catchAsync(async (req, res) => {
  await service.batalkanTiketMahasiswa(req.mahasiswa.id, Number(req.params.id));
  sendResponse(res, 200, { message: 'Tiket dibatalkan' });
});

module.exports = { list, detail, tanggapi, listMilikSendiri, ajukan, batalkan };
