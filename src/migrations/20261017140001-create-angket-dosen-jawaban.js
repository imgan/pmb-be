'use strict';

/**
 * Pilihan jawaban angket dosen (skala penilaian) — satu daftar untuk semua pertanyaan non-open
 * question & setiap dosen. Nilai unik; diisi 5 pilihan standar.
 */
const STANDAR = [
  ['Sangat baik', 5],
  ['Baik', 4],
  ['Cukup baik', 3],
  ['Tidak baik', 2],
  ['Sangat tidak baik', 1],
];

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('angket_dosen_jawaban', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      jawaban: { type: Sequelize.STRING(100), allowNull: false },
      nilai: { type: Sequelize.INTEGER, allowNull: false, unique: true },
      created_by: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      updated_by: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    const now = new Date();
    await queryInterface.bulkInsert(
      'angket_dosen_jawaban',
      STANDAR.map(([jawaban, nilai]) => ({ jawaban, nilai, created_at: now, updated_at: now }))
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('angket_dosen_jawaban');
  },
};
