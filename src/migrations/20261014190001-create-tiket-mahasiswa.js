'use strict';

// Pengajuan tiket bantuan dari portal mahasiswa (perangkat, jaringan, sistem informasi, data, dll),
// ditangani petugas di modul SIM (status, tanggapan, petugas).
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('tiket_mahasiswa', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      nomor_tiket: { type: Sequelize.STRING(30), allowNull: true, unique: true },
      mahasiswa_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'mahasiswa', key: 'id' }, onDelete: 'CASCADE' },
      jenis_kebutuhan: {
        type: Sequelize.ENUM('PERANGKAT_KOMPUTER', 'JARINGAN_INTERNET', 'SISTEM_INFORMASI', 'KEBUTUHAN_DATA', 'LAIN_LAIN'),
        allowNull: false,
      },
      uraian: { type: Sequelize.TEXT, allowNull: false },
      status: { type: Sequelize.ENUM('BARU', 'DIPROSES', 'SELESAI', 'DITOLAK'), allowNull: false, defaultValue: 'BARU' },
      // Tanggapan / alasan dari petugas.
      tanggapan: { type: Sequelize.TEXT, allowNull: true },
      petugas_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      tanggal_ditanggapi: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('tiket_mahasiswa', ['mahasiswa_id'], { name: 'idx_tiket_mahasiswa_mhs' });
    await queryInterface.addIndex('tiket_mahasiswa', ['status'], { name: 'idx_tiket_mahasiswa_status' });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('tiket_mahasiswa');
  },
};
