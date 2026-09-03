'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('surat_keterangan', 'status', {
      // Default DISETUJUI supaya surat yang dibuat langsung oleh staf BAAK (alur lama, tanpa
      // status) tetap langsung bisa dicetak seperti sebelumnya — hanya pengajuan baru dari
      // portal Mahasiswa yang secara eksplisit dibuat dengan status DIAJUKAN, menunggu staf
      // BAAK memprosesnya lewat form edit yang sudah ada.
      type: Sequelize.ENUM('DIAJUKAN', 'DISETUJUI', 'DITOLAK'),
      allowNull: false,
      defaultValue: 'DISETUJUI',
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('surat_keterangan', 'status');
  },
};
