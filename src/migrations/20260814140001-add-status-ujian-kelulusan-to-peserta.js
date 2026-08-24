'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('peserta', 'status_ujian', {
      type: Sequelize.ENUM('belum_ujian', 'lulus', 'tidak_lulus'),
      allowNull: false,
      defaultValue: 'belum_ujian',
    });
    await queryInterface.addColumn('peserta', 'status_kelulusan', {
      type: Sequelize.ENUM('menunggu', 'diterima', 'ditolak'),
      allowNull: false,
      defaultValue: 'menunggu',
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('peserta', 'status_ujian');
    await queryInterface.removeColumn('peserta', 'status_kelulusan');
  },
};
