'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('sync_finger_log', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      mesin: { type: Sequelize.ENUM('A1', 'A2'), allowNull: false },
      nik: { type: Sequelize.STRING(30), allowNull: false },
      tanggal: { type: Sequelize.DATE, allowNull: false },
      karyawan_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'karyawan', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      status: { type: Sequelize.ENUM('PENDING', 'PROCESSED'), allowNull: false, defaultValue: 'PENDING' },
      processed_at: { type: Sequelize.DATE, allowNull: true },
      created_by: { type: Sequelize.INTEGER, allowNull: true },
      updated_by: { type: Sequelize.INTEGER, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('sync_finger_log', ['mesin']);
    await queryInterface.addIndex('sync_finger_log', ['nik']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('sync_finger_log');
  },
};
