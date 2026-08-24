'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('audit_logs', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      actor_type: { type: Sequelize.ENUM('staff', 'peserta', 'public'), allowNull: false, defaultValue: 'public' },
      actor_id: { type: Sequelize.INTEGER, allowNull: true },
      actor_name: { type: Sequelize.STRING(150), allowNull: true },
      method: { type: Sequelize.STRING(10), allowNull: false },
      module: { type: Sequelize.STRING(100), allowNull: false },
      action: { type: Sequelize.STRING(20), allowNull: false },
      path: { type: Sequelize.STRING(255), allowNull: false },
      description: { type: Sequelize.STRING(500), allowNull: false },
      status_code: { type: Sequelize.INTEGER, allowNull: false },
      ip_address: { type: Sequelize.STRING(64), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addIndex('audit_logs', ['created_at']);
    await queryInterface.addIndex('audit_logs', ['module']);
    await queryInterface.addIndex('audit_logs', ['actor_type', 'actor_id']);
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('audit_logs');
  },
};
