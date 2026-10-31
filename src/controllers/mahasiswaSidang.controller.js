const Joi = require('joi');
const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const service = require('../services/mahasiswaSidang.service');

const daftarSidangSchema = Joi.object({ jadwalSidangId: Joi.number().integer().required().messages({ 'any.required': 'Pilih jadwal sidang' }) });

const get = catchAsync(async (req, res) => {
  const data = await service.getSidang(req.mahasiswa.id);
  sendResponse(res, 200, { message: 'Data sidang fetched', data });
});

const daftar = catchAsync(async (req, res) => {
  const { diperbarui } = await service.daftarSidang(req.mahasiswa.id, req.body);
  sendResponse(res, diperbarui ? 200 : 201, { message: diperbarui ? 'Jadwal sidang diperbarui' : 'Pendaftaran sidang berhasil', data: await service.getSidang(req.mahasiswa.id) });
});

const batal = catchAsync(async (req, res) => {
  await service.batalSidang(req.mahasiswa.id);
  sendResponse(res, 200, { message: 'Pendaftaran sidang dibatalkan' });
});

module.exports = { get, daftar, batal, daftarSidangSchema };
