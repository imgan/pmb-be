'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('menus', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      parent_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'menus', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      name: { type: Sequelize.STRING(100), allowNull: false },
      code: { type: Sequelize.STRING(50), allowNull: false, unique: true },
      path: { type: Sequelize.STRING(150), allowNull: true },
      icon: { type: Sequelize.STRING(50), allowNull: true },
      order_number: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('menus');
  },
};
