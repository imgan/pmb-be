'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('dinas_cuti_lupa_finger', 'status', {
      type: Sequelize.ENUM('DINAS_LUAR', 'CUTI', 'LUPA_KEHADIRAN', 'CUTI_SPESIAL', 'CUTI_BERSAMA'),
      allowNull: false,
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('dinas_cuti_lupa_finger', 'status', {
      type: Sequelize.ENUM('DINAS', 'CUTI', 'LUPA_FINGER'),
      allowNull: false,
    });
  },
};
