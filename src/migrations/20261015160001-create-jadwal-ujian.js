'use strict';

// Jadwal UTS/UAS per kelas kuliah (modul Prodi → Jadwal Kuliah → Jadwal Ujian). Kelas, mata kuliah,
// tahun ajaran & prodi diambil dari jadwal_kuliah; satu jadwal per kelas per jenis ujian.
module.exports = {
  up: async (queryInterface, Sequelize) => {
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
    await queryInterface.addIndex('jadwal_ujian', ['jadwal_kuliah_id', 'jenis_ujian'], { name: 'uq_jadwal_ujian_kelas_jenis', unique: true });
    await queryInterface.addIndex('jadwal_ujian', ['tanggal'], { name: 'idx_jadwal_ujian_tanggal' });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('jadwal_ujian');
  },
};
