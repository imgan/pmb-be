'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('audit_logs', 'actor_email', { type: Sequelize.STRING(150), allowNull: true });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('audit_logs', 'actor_email');
  },
};
