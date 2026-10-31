'use strict';

// Nomor Virtual Account (bank) per tagihan semester — diisi bagian keuangan lewat Edit / Import
// Tagihan, ditampilkan ke mahasiswa di portal Pembayaran Kuliah sebagai tujuan transfer.
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('tagihan_kuliah', 'no_virtual_account', {
      type: Sequelize.STRING(30),
      allowNull: true,
      after: 'tanggal_jatuh_tempo',
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('tagihan_kuliah', 'no_virtual_account');
  },
};
