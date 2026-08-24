'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('dinas_cuti_lupa_finger', 'lampiran_nama', {
      type: Sequelize.STRING(255),
      allowNull: true,
    });
    await queryInterface.addColumn('dinas_cuti_lupa_finger', 'lampiran', {
      type: Sequelize.TEXT('long'),
      allowNull: true,
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('dinas_cuti_lupa_finger', 'lampiran');
    await queryInterface.removeColumn('dinas_cuti_lupa_finger', 'lampiran_nama');
  },
};
