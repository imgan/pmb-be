'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('dosen', 'password', {
      type: Sequelize.STRING(255),
      allowNull: true,
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('dosen', 'password');
  },
};
