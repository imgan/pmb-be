'use strict';

// Pengajuan TA/Skripsi: prodi membuka periode pengajuan (tanggal mulai-selesai), mahasiswa mengajukan
// judul + tempat KKP/observasi + usulan pembimbing selama periode dibuka, prodi menyetujui/menolak.
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('periode_pengajuan_ta', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      // null = berlaku untuk semua prodi.
      jurusan_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'jurusan', key: 'id' }, onDelete: 'SET NULL' },
      tanggal_mulai: { type: Sequelize.DATEONLY, allowNull: false },
      tanggal_selesai: { type: Sequelize.DATEONLY, allowNull: false },
      // Info untuk mahasiswa, mis. rekening pembayaran & kontak kasir.
      keterangan: { type: Sequelize.TEXT, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      is_delete: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      created_by: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      updated_by: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.createTable('pengajuan_ta', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      periode_pengajuan_ta_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'periode_pengajuan_ta', key: 'id' },
        onDelete: 'CASCADE',
      },
      mahasiswa_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'mahasiswa', key: 'id' }, onDelete: 'CASCADE' },
      no_telepon: { type: Sequelize.STRING(30), allowNull: true },
      email: { type: Sequelize.STRING(150), allowNull: true },
      judul: { type: Sequelize.TEXT, allowNull: false },
      tempat_kkp: { type: Sequelize.STRING(200), allowNull: true },
      pembimbing_utama_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'dosen', key: 'id' }, onDelete: 'SET NULL' },
      pembimbing_pendamping_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'dosen', key: 'id' }, onDelete: 'SET NULL' },
      status: { type: Sequelize.ENUM('DIAJUKAN', 'DISETUJUI', 'DITOLAK'), allowNull: false, defaultValue: 'DIAJUKAN' },
      catatan_prodi: { type: Sequelize.TEXT, allowNull: true },
      diverifikasi_oleh: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      diverifikasi_at: { type: Sequelize.DATE, allowNull: true },
      is_delete: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('pengajuan_ta', ['periode_pengajuan_ta_id', 'mahasiswa_id'], { name: 'idx_pengajuan_ta_periode_mhs' });
    await queryInterface.addIndex('pengajuan_ta', ['status'], { name: 'idx_pengajuan_ta_status' });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('pengajuan_ta');
    await queryInterface.dropTable('periode_pengajuan_ta');
  },
};
