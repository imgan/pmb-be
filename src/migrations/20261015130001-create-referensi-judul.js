'use strict';

// Referensi judul TA/Skripsi (riwayat judul mahasiswa) — diinput BAAK, dilihat dosen di portal
// (Lain-Lain → Referensi Judul) dengan filter prodi & periode. NIM/nama disimpan apa adanya supaya
// judul alumni dari sistem lama yang tidak ada di tabel mahasiswa tetap bisa dicatat.
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('referensi_judul', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      jurusan_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'jurusan', key: 'id' } },
      tahun_ajaran_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'tahun_ajaran', key: 'id' } },
      nim: { type: Sequelize.STRING(30), allowNull: false },
      nama: { type: Sequelize.STRING(150), allowNull: false },
      judul: { type: Sequelize.TEXT, allowNull: false },
      is_delete: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      created_by: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      updated_by: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('referensi_judul', ['jurusan_id', 'tahun_ajaran_id', 'is_delete'], { name: 'idx_referensi_judul_filter' });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('referensi_judul');
  },
};
