'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('bimbingan_magang', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      mahasiswa_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'mahasiswa', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      pembimbing_magang_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'pembimbing_magang', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      judul: { type: Sequelize.TEXT, allowNull: true },
      nilai: { type: Sequelize.STRING(10), allowNull: true },
      kelas: { type: Sequelize.STRING(20), allowNull: true },
      is_delete: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      created_by: { type: Sequelize.INTEGER, allowNull: true },
      updated_by: { type: Sequelize.INTEGER, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('bimbingan_magang', ['mahasiswa_id']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('bimbingan_magang');
  },
};
