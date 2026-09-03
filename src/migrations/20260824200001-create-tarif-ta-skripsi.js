'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('tarif_ta_skripsi', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      periode: { type: Sequelize.INTEGER, allowNull: false },
      jurusan_id: { type: Sequelize.INTEGER, allowNull: false },
      biaya_pendaftaran: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
      biaya_perpanjangan: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_by: { type: Sequelize.INTEGER, allowNull: true },
      updated_by: { type: Sequelize.INTEGER, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('tarif_ta_skripsi', ['jurusan_id']);
    await queryInterface.addIndex('tarif_ta_skripsi', ['periode']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('tarif_ta_skripsi');
  },
};
