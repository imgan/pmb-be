'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('kampus', 'website_title', { type: Sequelize.STRING(150), allowNull: true });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('kampus', 'website_title');
  },
};
