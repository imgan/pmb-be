'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('jurusan', 'foto', { type: Sequelize.TEXT('long'), allowNull: true });
    await queryInterface.addColumn('jurusan', 'prospek_karir', { type: Sequelize.TEXT, allowNull: true });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('jurusan', 'foto');
    await queryInterface.removeColumn('jurusan', 'prospek_karir');
  },
};
