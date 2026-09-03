'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('menus', 'module', {
      type: Sequelize.ENUM('pmb', 'baak', 'sdi', 'prodi', 'keuangan', 'sim'),
      allowNull: false,
      defaultValue: 'pmb',
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('menus', 'module', {
      type: Sequelize.ENUM('pmb', 'baak', 'sdi', 'prodi', 'keuangan'),
      allowNull: false,
      defaultValue: 'pmb',
    });
  },
};
