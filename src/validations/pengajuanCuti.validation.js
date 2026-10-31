const Joi = require('joi');

const tanggal = Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/);

// mahasiswaId, tanggal ajuan & tahun ajaran TIDAK dari client — diisi di service.
const ajukanCuti = Joi.object({
  semester: Joi.number().integer().min(1).max(14).required().messages({ 'any.required': 'Semester wajib dipilih' }),
  tanggalAwal: tanggal.required().messages({ 'any.required': 'Tanggal awal cuti wajib diisi', 'string.pattern.base': 'Tanggal awal tidak valid' }),
  tanggalAkhir: tanggal.required().messages({ 'any.required': 'Tanggal akhir cuti wajib diisi', 'string.pattern.base': 'Tanggal akhir tidak valid' }),
  alasan: Joi.string().trim().max(2000).required().messages({ 'any.required': 'Alasan wajib diisi', 'string.empty': 'Alasan wajib diisi' }),
});

const verifikasiCuti = Joi.object({
  status: Joi.string().valid('DISETUJUI', 'DITOLAK').required(),
  catatanProdi: Joi.string().trim().max(2000).allow('', null),
});

module.exports = { ajukanCuti, verifikasiCuti };
