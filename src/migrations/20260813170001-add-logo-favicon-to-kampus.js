'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('kampus', 'logo_url', { type: Sequelize.TEXT('long'), allowNull: true });
    await queryInterface.addColumn('kampus', 'favicon_url', { type: Sequelize.TEXT('long'), allowNull: true });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('kampus', 'logo_url');
    await queryInterface.removeColumn('kampus', 'favicon_url');
  },
};
