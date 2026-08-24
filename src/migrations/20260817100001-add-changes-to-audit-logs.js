'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('audit_logs', 'changes', { type: Sequelize.TEXT('long'), allowNull: true });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('audit_logs', 'changes');
  },
};
