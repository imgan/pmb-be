'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('mahasiswa', 'status_masuk', {
      type: Sequelize.ENUM('BARU', 'TRANSFER_LUAR', 'TRANSFER_DALAM', 'TRANSFER_LUAR_KARYAWAN', 'TRANSFER_DALAM_KARYAWAN'),
      allowNull: false,
      defaultValue: 'BARU',
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('mahasiswa', 'status_masuk');
  },
};
