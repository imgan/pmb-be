'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('dinas_cuti_lupa_finger', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      karyawan_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'karyawan', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      tanggal_kehadiran: { type: Sequelize.DATEONLY, allowNull: false },
      status: { type: Sequelize.ENUM('DINAS', 'CUTI', 'LUPA_FINGER'), allowNull: false },
      keperluan: { type: Sequelize.TEXT, allowNull: true },
      created_by: { type: Sequelize.INTEGER, allowNull: true },
      updated_by: { type: Sequelize.INTEGER, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('dinas_cuti_lupa_finger', ['karyawan_id']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('dinas_cuti_lupa_finger');
  },
};
