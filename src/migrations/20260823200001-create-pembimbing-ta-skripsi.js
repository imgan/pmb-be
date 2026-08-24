'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('pembimbing_ta_skripsi', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      dosen_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'dosen', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      no_sk: { type: Sequelize.STRING(100), allowNull: true },
      tanggal_sk: { type: Sequelize.DATEONLY, allowNull: true },
      pembimbing_ke: { type: Sequelize.ENUM('UTAMA', 'PENDAMPING'), allowNull: false, defaultValue: 'UTAMA' },
      periode_mulai: { type: Sequelize.DATEONLY, allowNull: false },
      periode_selesai: { type: Sequelize.DATEONLY, allowNull: false },
      is_delete: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      created_by: { type: Sequelize.INTEGER, allowNull: true },
      updated_by: { type: Sequelize.INTEGER, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('pembimbing_ta_skripsi', ['dosen_id']);
    await queryInterface.addIndex('pembimbing_ta_skripsi', ['periode_mulai', 'periode_selesai']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('pembimbing_ta_skripsi');
  },
};
