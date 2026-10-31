'use strict';

// Pendaftaran KKP dari portal mahasiswa (Pengajuan → Kuliah Kerja Praktek) disimpan ke nilai_magang
// (data yang sama dipakai menu Prodi → Nilai Magang). Kolom yang belum ada: kontak perusahaan.
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('nilai_magang', 'email_perusahaan', {
      type: Sequelize.STRING(150),
      allowNull: true,
      after: 'alamat_lokasi',
    });
    await queryInterface.addColumn('nilai_magang', 'telepon_perusahaan', {
      type: Sequelize.STRING(30),
      allowNull: true,
      after: 'email_perusahaan',
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('nilai_magang', 'telepon_perusahaan');
    await queryInterface.removeColumn('nilai_magang', 'email_perusahaan');
  },
};
