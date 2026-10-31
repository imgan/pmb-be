'use strict';

// Pengumuman akademik dari BAAK untuk portal mahasiswa (semua prodi atau satu prodi tertentu),
// tampil selama tanggal terbit s.d. tanggal berakhir.
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('pengumuman', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      judul: { type: Sequelize.STRING(200), allowNull: false },
      isi: { type: Sequelize.TEXT('medium'), allowNull: false },
      // null = untuk semua prodi.
      jurusan_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'jurusan', key: 'id' }, onDelete: 'SET NULL' },
      tanggal_terbit: { type: Sequelize.DATEONLY, allowNull: false },
      tanggal_berakhir: { type: Sequelize.DATEONLY, allowNull: true },
      is_penting: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      is_delete: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      created_by: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      updated_by: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('pengumuman', ['is_delete', 'is_active', 'tanggal_terbit'], { name: 'idx_pengumuman_tayang' });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('pengumuman');
  },
};
