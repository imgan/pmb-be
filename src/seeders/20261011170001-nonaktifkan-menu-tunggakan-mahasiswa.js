'use strict';

// Menu Keuangan > Transaksi > Tunggakan Mahasiswa dinonaktifkan: tunggakan semester lalu sudah
// tergabung di Tagihan Mahasiswa (filter "Ada Tunggakan", kolom Tunggakan Semester Lalu di export,
// riwayat pembayaran per mahasiswa). Menu tidak dihapus agar bisa diaktifkan lagi (lihat down).
const CODE = 'KEUANGAN_TUNGGAKAN_MAHASISWA_MANAGEMENT';

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.bulkUpdate('menus', { is_active: false, updated_at: new Date() }, { code: CODE });
  },
  down: async (queryInterface) => {
    await queryInterface.bulkUpdate('menus', { is_active: true, updated_at: new Date() }, { code: CODE });
  },
};
