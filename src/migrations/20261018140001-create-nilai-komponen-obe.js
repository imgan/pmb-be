'use strict';

/**
 * Input Nilai kelas OBE (portal dosen): nilai mahasiswa per komponen Komposisi Nilai Kelas (bobot_obe) —
 * kunci "1" = metode ke-1 tanpa sub, "1.2" = sub ke-2 metode ke-1. Ringkasannya per jenis (tugas, uts, ...)
 * tetap ditulis ke nilai_mahasiswa supaya KHS & perhitungan nilai akhir lama tidak berubah.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('nilai_komponen_obe', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      jadwal_kuliah_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'jadwal_kuliah', key: 'id' }, onDelete: 'CASCADE' },
      mahasiswa_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'mahasiswa', key: 'id' }, onDelete: 'CASCADE' },
      kunci: { type: Sequelize.STRING(20), allowNull: false },
      nilai: { type: Sequelize.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('nilai_komponen_obe', ['jadwal_kuliah_id', 'mahasiswa_id', 'kunci'], { name: 'uq_nilai_komponen_obe', unique: true });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('nilai_komponen_obe');
  },
};
