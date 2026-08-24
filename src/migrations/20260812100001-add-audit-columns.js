'use strict';

const TABLES = ['roles', 'menus', 'users', 'role_menu_permissions'];

module.exports = {
  up: async (queryInterface, Sequelize) => {
    for (const table of TABLES) {
      await queryInterface.addColumn(table, 'created_by', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      });
      await queryInterface.addColumn(table, 'updated_by', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      });
    }
  },
  down: async (queryInterface) => {
    for (const table of TABLES) {
      await queryInterface.removeColumn(table, 'created_by');
      await queryInterface.removeColumn(table, 'updated_by');
    }
  },
};
