'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('jadwal_kuliah', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      kelas: { type: Sequelize.STRING(30), allowNull: false },
      kode_mata_kuliah: { type: Sequelize.STRING(30), allowNull: false },
      nama_mata_kuliah: { type: Sequelize.STRING(150), allowNull: false },
      sks: { type: Sequelize.INTEGER, allowNull: true },
      dosen_kordinator_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'dosen', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      hari: {
        type: Sequelize.ENUM('SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'),
        allowNull: true,
      },
      jam: { type: Sequelize.INTEGER, allowNull: true },
      ruangan: { type: Sequelize.STRING(50), allowNull: true },
      gcr: { type: Sequelize.STRING(255), allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      updated_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('jadwal_kuliah');
  },
};
