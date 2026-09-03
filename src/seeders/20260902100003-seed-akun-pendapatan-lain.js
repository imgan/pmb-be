'use strict';

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();
    await queryInterface.bulkInsert('akun', [
      {
        kode: '4-1005',
        nama: 'Pendapatan Biaya Lain',
        kategori: 'PENDAPATAN',
        saldo_normal: 'KREDIT',
        is_active: true,
        created_at: now,
        updated_at: now,
      },
    ]);
  },
  down: async (queryInterface) => {
    await queryInterface.bulkDelete('akun', { kode: '4-1005' });
  },
};
