'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('mahasiswa', 'status_keluar', {
      type: Sequelize.ENUM(
        'CUTI',
        'MENGUNDURKAN_DIRI',
        'DROP_OUT',
        'HABIS_MASA_STUDI',
        'MUTASI',
        'PUTUS_SEKOLAH',
        'WAFAT',
        'HILANG',
        'LAINNYA'
      ),
      allowNull: true,
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('mahasiswa', 'status_keluar', {
      type: Sequelize.ENUM('CUTI', 'MENGUNDURKAN_DIRI', 'DROP_OUT', 'HABIS_MASA_STUDI'),
      allowNull: true,
    });
  },
};
