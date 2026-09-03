'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('mahasiswa', 'photo', {
      type: Sequelize.TEXT('long'),
      allowNull: true,
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('mahasiswa', 'photo');
  },
};
