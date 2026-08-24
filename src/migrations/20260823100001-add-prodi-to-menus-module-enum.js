'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('menus', 'module', {
      type: Sequelize.ENUM('pmb', 'baak', 'sdi', 'prodi'),
      allowNull: false,
      defaultValue: 'pmb',
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('menus', 'module', {
      type: Sequelize.ENUM('pmb', 'baak', 'sdi'),
      allowNull: false,
      defaultValue: 'pmb',
    });
  },
};
