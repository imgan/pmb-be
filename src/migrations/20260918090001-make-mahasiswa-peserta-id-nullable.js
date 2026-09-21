'use strict';

/**
 * Mahasiswa hasil migrasi data lama (SIAKAD/Excel, bukan lewat alur pendaftaran PMB online)
 * tidak punya baris Peserta — pesertaId dilonggarkan jadi nullable supaya bisa menampung
 * mahasiswa lama tanpa harus membuat data Peserta palsu.
 */
module.exports = {
  // Sequelize's changeColumn() tidak reliable untuk kolom yang punya UNIQUE + FK sekaligus di
  // MySQL (silently tidak mengubah nullability) — pakai raw ALTER TABLE supaya pasti kena.
  up: async (queryInterface) => {
    await queryInterface.sequelize.query('ALTER TABLE `mahasiswa` MODIFY `peserta_id` INT NULL');
  },
  down: async (queryInterface) => {
    await queryInterface.sequelize.query('ALTER TABLE `mahasiswa` MODIFY `peserta_id` INT NOT NULL');
  },
};
