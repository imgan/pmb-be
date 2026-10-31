'use strict';

// Pengajuan cuti akademik dari portal mahasiswa (Pengajuan → Cuti). Prodi menyetujui/menolak di menu
// Master Cuti; saat disetujui, mahasiswa ditandai statusKeluar = CUTI.
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('pengajuan_cuti', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      mahasiswa_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'mahasiswa', key: 'id' }, onDelete: 'CASCADE' },
      tahun_ajaran_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'tahun_ajaran', key: 'id' }, onDelete: 'SET NULL' },
      semester: { type: Sequelize.INTEGER, allowNull: false },
      tanggal_awal: { type: Sequelize.DATEONLY, allowNull: false },
      tanggal_akhir: { type: Sequelize.DATEONLY, allowNull: false },
      tanggal_ajuan: { type: Sequelize.DATEONLY, allowNull: false },
      alasan: { type: Sequelize.TEXT, allowNull: false },
      status: { type: Sequelize.ENUM('DIAJUKAN', 'DISETUJUI', 'DITOLAK'), allowNull: false, defaultValue: 'DIAJUKAN' },
      catatan_prodi: { type: Sequelize.TEXT, allowNull: true },
      diverifikasi_oleh: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      diverifikasi_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('pengajuan_cuti', ['mahasiswa_id'], { name: 'idx_pengajuan_cuti_mahasiswa' });
    await queryInterface.addIndex('pengajuan_cuti', ['status'], { name: 'idx_pengajuan_cuti_status' });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('pengajuan_cuti');
  },
};
