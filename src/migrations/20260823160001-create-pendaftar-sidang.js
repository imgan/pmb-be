'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('pendaftar_sidang', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      mahasiswa_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'mahasiswa', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      jadwal_sidang_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'jadwal_sidang', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      judul: { type: Sequelize.TEXT, allowNull: false },
      pembimbing1_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'dosen', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      pembimbing2_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'dosen', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      is_delete: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      created_by: { type: Sequelize.INTEGER, allowNull: true },
      updated_by: { type: Sequelize.INTEGER, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('pendaftar_sidang', ['jadwal_sidang_id']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('pendaftar_sidang');
  },
};
