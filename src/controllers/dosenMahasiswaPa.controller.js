const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const service = require('../services/dosenMahasiswaPa.service');
const laporanKhsService = require('../services/laporanKhs.service');
const kampusService = require('../services/kampus.service');
const { buildLaporanKhsPdf } = require('../services/laporanKhsPdf.service');

const list = catchAsync(async (req, res) => {
  const data = await service.listMahasiswaPa(req.dosen.id);
  sendResponse(res, 200, { message: 'Mahasiswa bimbingan akademik fetched', data });
});

const biodata = catchAsync(async (req, res) => {
  const data = await service.getBiodataPa(req.dosen.id, Number(req.params.id));
  sendResponse(res, 200, { message: 'Biodata mahasiswa fetched', data });
});

const krs = catchAsync(async (req, res) => {
  const data = await service.getKrsTerakhirPa(req.dosen.id, Number(req.params.id));
  sendResponse(res, 200, { message: 'KRS mahasiswa fetched', data });
});

/** KHS seluruh semester mahasiswa bimbingan (PDF, format sama dengan cetak KHS). */
const khsPdf = catchAsync(async (req, res) => {
  const mahasiswaId = Number(req.params.id);
  await service.assertMahasiswaPa(req.dosen.id, mahasiswaId);
  const [data, kampus] = await Promise.all([laporanKhsService.getKhsSemuaSemester(mahasiswaId), kampusService.getKampus()]);
  if (!data.length) throw new ApiError(404, 'Mahasiswa ini belum punya nilai');
  const doc = buildLaporanKhsPdf(data, kampus);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="khs-${data[0].mahasiswa.nim}-semua-semester.pdf"`);
  doc.pipe(res);
});

module.exports = { list, biodata, krs, khsPdf };
