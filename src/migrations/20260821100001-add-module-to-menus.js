'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('menus', 'module', {
      type: Sequelize.ENUM('pmb', 'baak'),
      allowNull: false,
      defaultValue: 'pmb',
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('menus', 'module');
  },
};
