'use strict';

// Biodata dosen pada SDM (dashboard portal dosen): No WhatsApp, jabatan fungsional & KUM di tabel
// dosen, riwayat pendidikan dosen, serta sasaran pengumuman BAAK (semua / mahasiswa / dosen).
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('dosen', 'no_whatsapp', { type: Sequelize.STRING(30), allowNull: true, after: 'telp_hp' });
    await queryInterface.addColumn('dosen', 'jabatan_fungsional', { type: Sequelize.STRING(50), allowNull: true, after: 'status_dosen' });
    await queryInterface.addColumn('dosen', 'kum', { type: Sequelize.DECIMAL(8, 2), allowNull: true, after: 'jabatan_fungsional' });

    await queryInterface.createTable('riwayat_pendidikan_dosen', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      dosen_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'dosen', key: 'id' }, onDelete: 'CASCADE' },
      perguruan_tinggi: { type: Sequelize.STRING(200), allowNull: false },
      jenjang: { type: Sequelize.STRING(20), allowNull: false },
      program_studi: { type: Sequelize.STRING(150), allowNull: true },
      gelar: { type: Sequelize.STRING(50), allowNull: true },
      tahun_lulus: { type: Sequelize.INTEGER, allowNull: true },
      no_ijazah: { type: Sequelize.STRING(100), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('riwayat_pendidikan_dosen', ['dosen_id'], { name: 'idx_riwayat_pendidikan_dosen' });

    await queryInterface.addColumn('pengumuman', 'untuk', {
      type: Sequelize.ENUM('SEMUA', 'MAHASISWA', 'DOSEN'),
      allowNull: false,
      defaultValue: 'SEMUA',
      after: 'jurusan_id',
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('pengumuman', 'untuk');
    await queryInterface.dropTable('riwayat_pendidikan_dosen');
    await queryInterface.removeColumn('dosen', 'kum');
    await queryInterface.removeColumn('dosen', 'jabatan_fungsional');
    await queryInterface.removeColumn('dosen', 'no_whatsapp');
  },
};
