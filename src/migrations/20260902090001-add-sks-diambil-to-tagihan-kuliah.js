'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('tagihan_kuliah', 'sks_diambil', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });
    await queryInterface.addColumn('tagihan_kuliah', 'harga_per_sks', {
      type: Sequelize.DECIMAL(14, 2),
      allowNull: false,
      defaultValue: 0,
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('tagihan_kuliah', 'sks_diambil');
    await queryInterface.removeColumn('tagihan_kuliah', 'harga_per_sks');
  },
};
