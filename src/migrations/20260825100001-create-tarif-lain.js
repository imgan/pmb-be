'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('tarif_lain', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      kode_biaya: { type: Sequelize.STRING(30), allowNull: false },
      tahun_masuk: { type: Sequelize.INTEGER, allowNull: false },
      biaya: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
      keterangan: { type: Sequelize.STRING(150), allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_by: { type: Sequelize.INTEGER, allowNull: true },
      updated_by: { type: Sequelize.INTEGER, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('tarif_lain', ['kode_biaya']);
    await queryInterface.addIndex('tarif_lain', ['tahun_masuk']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('tarif_lain');
  },
};
