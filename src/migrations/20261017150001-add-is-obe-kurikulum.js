'use strict';

// Penanda kurikulum berbasis OBE (Outcome-Based Education) vs non-OBE, tampil di Master Kurikulum.
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('kurikulum', 'is_obe', { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false, after: 'nama' });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('kurikulum', 'is_obe');
  },
};
