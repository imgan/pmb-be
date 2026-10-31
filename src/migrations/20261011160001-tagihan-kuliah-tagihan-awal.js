'use strict';

// Tagihan hasil import: tagihan_awal = Total Tagihan dari file keuangan (belum dipotong);
// total_tagihan = tagihan_awal - potongan (Daftar Potongan, tanpa masa tenggang). Kolom total_tagihan
// tetap jadi acuan semua modul (cekal, kasir, kwitansi, laporan, portal).
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('tagihan_kuliah', 'tagihan_awal', {
      type: Sequelize.DECIMAL(14, 2),
      allowNull: true,
      after: 'potongan',
    });
    await queryInterface.sequelize.query(
      "UPDATE tagihan_kuliah SET tagihan_awal = total_tagihan + potongan WHERE sumber = 'IMPORT'"
    );
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('tagihan_kuliah', 'tagihan_awal');
  },
};
