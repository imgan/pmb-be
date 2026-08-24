'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('jadwal_kuliah_dosen_pengampu', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      jadwal_kuliah_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'jadwal_kuliah', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      dosen_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'dosen', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('jadwal_kuliah_dosen_pengampu', ['jadwal_kuliah_id', 'dosen_id'], {
      unique: true,
      name: 'jadwal_kuliah_dosen_pengampu_unique',
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('jadwal_kuliah_dosen_pengampu');
  },
};
