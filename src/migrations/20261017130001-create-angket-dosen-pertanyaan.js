'use strict';

/**
 * Master pertanyaan angket dosen (penilaian dosen oleh mahasiswa / EDOM). Satu daftar yang sama
 * untuk setiap dosen. open_question = jawaban isian bebas, bukan skala.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('angket_dosen_pertanyaan', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      pertanyaan: { type: Sequelize.TEXT, allowNull: false },
      open_question: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      urutan: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      created_by: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      updated_by: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('angket_dosen_pertanyaan');
  },
};
