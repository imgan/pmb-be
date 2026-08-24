'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('role_menu_permissions', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      role_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'roles', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      menu_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'menus', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      can_create: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      can_read: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      can_update: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      can_delete: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addConstraint('role_menu_permissions', {
      fields: ['role_id', 'menu_id'],
      type: 'unique',
      name: 'uq_role_menu_permissions_role_menu',
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('role_menu_permissions');
  },
};
