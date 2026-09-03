'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('mahasiswa', 'password', {
      type: Sequelize.STRING(255),
      allowNull: true,
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('mahasiswa', 'password');
  },
};
