'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('jurusan', 'kode_prodi', { type: Sequelize.STRING(20), allowNull: true });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('jurusan', 'kode_prodi');
  },
};
