const catchAsync = require('../utils/catchAsync');
const reportFingerService = require('../services/reportFinger.service');
const { buildReportFingerPdf } = require('../services/reportFingerPdf.service');

const cetakPdf = catchAsync(async (req, res) => {
  const data = await reportFingerService.getReportData(req.query);
  const doc = buildReportFingerPdf(data);
  const filename = `rekap-kehadiran-${data.karyawan.namaLengkap.replace(/\s+/g, '-')}.pdf`;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
  doc.pipe(res);
});

module.exports = { cetakPdf };
