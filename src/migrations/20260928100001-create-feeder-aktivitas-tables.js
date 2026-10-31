'use strict';

// Aktivitas Mahasiswa Feeder PDDIKTI beserta peserta & dosen (pembimbing/penguji).
// `kategori` memisahkan menu SIM: TA (tugas akhir/bimbingan), KKP (kerja praktek), PA
// (bimbingan akademis/pembimbing akademik). `source_key` menandai baris hasil generate dari
// data akademik (mis. "SIDANG:6") supaya generate ulang tidak menggandakan data.
const audit = (Sequelize) => ({
  created_by: {
    type: Sequelize.INTEGER,
    allowNull: true,
    references: { model: 'users', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  },
  updated_by: {
    type: Sequelize.INTEGER,
    allowNull: true,
    references: { model: 'users', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  },
  created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
  updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
});

const fk = (Sequelize, model, { allowNull = false, onDelete = 'CASCADE' } = {}) => ({
  type: Sequelize.INTEGER,
  allowNull,
  references: { model, key: 'id' },
  onUpdate: 'CASCADE',
  onDelete,
});

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('feeder_aktivitas', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      kategori: { type: Sequelize.ENUM('TA', 'KKP', 'PA'), allowNull: false },
      periode: { type: Sequelize.STRING(5), allowNull: false },
      jurusan_id: fk(Sequelize, 'jurusan', { allowNull: true, onDelete: 'SET NULL' }),
      jenis_aktivitas: { type: Sequelize.STRING(3), allowNull: false },
      judul: { type: Sequelize.TEXT, allowNull: false },
      lokasi: { type: Sequelize.STRING(200), allowNull: true },
      no_sk: { type: Sequelize.STRING(100), allowNull: true },
      tanggal_sk: { type: Sequelize.DATEONLY, allowNull: true },
      jenis_anggota: { type: Sequelize.STRING(1), allowNull: false, defaultValue: '0' },
      keterangan: { type: Sequelize.TEXT, allowNull: true },
      source_key: { type: Sequelize.STRING(60), allowNull: true, unique: true },
      ...audit(Sequelize),
    });
    await queryInterface.addIndex('feeder_aktivitas', ['kategori', 'periode'], { name: 'feeder_aktivitas_kategori_periode' });

    await queryInterface.createTable('feeder_aktivitas_peserta', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      aktivitas_id: fk(Sequelize, 'feeder_aktivitas'),
      mahasiswa_id: fk(Sequelize, 'mahasiswa'),
      jenis_peran: { type: Sequelize.STRING(1), allowNull: false, defaultValue: '3' },
      ...audit(Sequelize),
    });
    await queryInterface.addIndex('feeder_aktivitas_peserta', ['aktivitas_id', 'mahasiswa_id'], {
      unique: true,
      name: 'feeder_aktivitas_peserta_unique',
    });

    await queryInterface.createTable('feeder_aktivitas_dosen', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      aktivitas_id: fk(Sequelize, 'feeder_aktivitas'),
      dosen_id: fk(Sequelize, 'dosen'),
      peran: { type: Sequelize.ENUM('PEMBIMBING', 'PENGUJI'), allowNull: false },
      urutan: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      kategori_kegiatan: { type: Sequelize.STRING(20), allowNull: true },
      ...audit(Sequelize),
    });
    await queryInterface.addIndex('feeder_aktivitas_dosen', ['aktivitas_id', 'dosen_id', 'peran'], {
      unique: true,
      name: 'feeder_aktivitas_dosen_unique',
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('feeder_aktivitas_dosen');
    await queryInterface.dropTable('feeder_aktivitas_peserta');
    await queryInterface.dropTable('feeder_aktivitas');
  },
};
