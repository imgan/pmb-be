'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('users', 'photo', { type: Sequelize.TEXT('long'), allowNull: true });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('users', 'photo');
  },
};
