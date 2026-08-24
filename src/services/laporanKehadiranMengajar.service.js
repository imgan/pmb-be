const { JadwalKuliah, Dosen, KehadiranDosen } = require('../models');
const ApiError = require('../utils/ApiError');

const getJadwalWithContext = async (jadwalKuliahId) => {
  const jadwal = await JadwalKuliah.findByPk(jadwalKuliahId, {
    include: [
      { model: Dosen, as: 'dosenKordinator' },
      { model: Dosen, as: 'dosenPengampu', through: { attributes: [] } },
    ],
  });
  if (!jadwal) throw new ApiError(404, 'Jadwal kuliah not found');
  return jadwal;
};

const getRealisasiRows = async (jadwalKuliahId) =>
  KehadiranDosen.findAll({
    where: { jadwalKuliahId },
    include: [{ model: Dosen, as: 'dosen' }],
    order: [['tanggalRealisasi', 'ASC']],
  });

module.exports = { getJadwalWithContext, getRealisasiRows };
