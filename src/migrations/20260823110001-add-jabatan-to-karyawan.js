'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('karyawan', 'jabatan', {
      type: Sequelize.STRING(100),
      allowNull: true,
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('karyawan', 'jabatan');
  },
};
