'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('mahasiswa', 'status_keluar', {
      type: Sequelize.ENUM('CUTI', 'MENGUNDURKAN_DIRI', 'DROP_OUT', 'HABIS_MASA_STUDI'),
      allowNull: true,
    });
    await queryInterface.addColumn('mahasiswa', 'tanggal_keluar', {
      type: Sequelize.DATEONLY,
      allowNull: true,
    });
    await queryInterface.addColumn('mahasiswa', 'alasan_keluar', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('mahasiswa', 'status_keluar');
    await queryInterface.removeColumn('mahasiswa', 'tanggal_keluar');
    await queryInterface.removeColumn('mahasiswa', 'alasan_keluar');
  },
};
