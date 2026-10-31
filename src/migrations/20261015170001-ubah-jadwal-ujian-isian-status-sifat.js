'use strict';

/**
 * Jadwal ujian mengikuti jadwal kuliah dari BAAK: ruangan, jam ke-, dosen & rencana pengawas diambil
 * dari jadwal_kuliah, prodi/dosen hanya mengisi Status (online/offline), Sifat ujian & Tanggal Ujian.
 * Kolom jam/ruangan/pengawas di versi awal dibuang; tabel masih kosong saat migrasi ini dibuat.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const [[{ n }]] = await queryInterface.sequelize.query('SELECT COUNT(*) AS n FROM jadwal_ujian');
    if (Number(n) > 0) throw new Error('jadwal_ujian sudah berisi data; ubah struktur secara manual');
    await queryInterface.dropTable('jadwal_ujian');
    await queryInterface.createTable('jadwal_ujian', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      jadwal_kuliah_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'jadwal_kuliah', key: 'id' }, onDelete: 'CASCADE' },
      jenis_ujian: { type: Sequelize.ENUM('UTS', 'UAS'), allowNull: false },
      status: { type: Sequelize.ENUM('ONLINE', 'OFFLINE'), allowNull: true },
      sifat: { type: Sequelize.STRING(30), allowNull: true },
      tanggal: { type: Sequelize.DATEONLY, allowNull: true },
      // Pengisi terakhir: user admin (prodi) atau dosen (portal dosen).
      updated_by: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      updated_by_dosen_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'dosen', key: 'id' }, onDelete: 'SET NULL' },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('jadwal_ujian', ['jadwal_kuliah_id', 'jenis_ujian'], { name: 'uq_jadwal_ujian_kelas_jenis', unique: true });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('jadwal_ujian');
    await queryInterface.createTable('jadwal_ujian', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      jadwal_kuliah_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'jadwal_kuliah', key: 'id' }, onDelete: 'CASCADE' },
      jenis_ujian: { type: Sequelize.ENUM('UTS', 'UAS'), allowNull: false },
      tanggal: { type: Sequelize.DATEONLY, allowNull: false },
      jam_mulai: { type: Sequelize.TIME, allowNull: false },
      jam_selesai: { type: Sequelize.TIME, allowNull: false },
      ruangan: { type: Sequelize.STRING(50), allowNull: true },
      pengawas_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'dosen', key: 'id' }, onDelete: 'SET NULL' },
      keterangan: { type: Sequelize.STRING(255), allowNull: true },
      created_by: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      updated_by: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
  },
};
