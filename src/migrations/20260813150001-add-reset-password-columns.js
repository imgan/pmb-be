'use strict';

const TABLES = ['users', 'peserta'];

module.exports = {
  up: async (queryInterface, Sequelize) => {
    for (const table of TABLES) {
      await queryInterface.addColumn(table, 'reset_password_token', {
        type: Sequelize.STRING(255),
        allowNull: true,
      });
      await queryInterface.addColumn(table, 'reset_password_expires', {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }
  },
  down: async (queryInterface) => {
    for (const table of TABLES) {
      await queryInterface.removeColumn(table, 'reset_password_token');
      await queryInterface.removeColumn(table, 'reset_password_expires');
    }
  },
};
