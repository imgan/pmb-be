'use strict';

// Master Ruangan (Modul Admin → Master → Ruangan): data ruang kuliah/lab per kampus & lantai.
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('ruangan', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      nama_ruang: { type: Sequelize.STRING(50), allowNull: false },
      kampus: { type: Sequelize.STRING(50), allowNull: true },
      lantai: { type: Sequelize.INTEGER, allowNull: true },
      projector: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      keterangan: { type: Sequelize.STRING(255), allowNull: true },
      fungsi: { type: Sequelize.STRING(100), allowNull: true },
      kursi: { type: Sequelize.INTEGER, allowNull: true },
      is_delete: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      created_by: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      updated_by: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('ruangan', ['nama_ruang', 'is_delete'], { name: 'idx_ruangan_nama_ruang' });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('ruangan');
  },
};
