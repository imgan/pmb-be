'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('tarif_pembimbing', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      periode: { type: Sequelize.INTEGER, allowNull: false },
      jurusan_id: { type: Sequelize.INTEGER, allowNull: false },
      biaya_pembimbing_utama: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
      biaya_pembimbing_pendamping: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
      biaya_pembimbing_asisten: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
      biaya_pembimbing_tunggal: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_by: { type: Sequelize.INTEGER, allowNull: true },
      updated_by: { type: Sequelize.INTEGER, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('tarif_pembimbing', ['jurusan_id']);
    await queryInterface.addIndex('tarif_pembimbing', ['periode']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('tarif_pembimbing');
  },
};
