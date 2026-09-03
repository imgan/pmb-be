'use strict';

// Chart of Account (COA) minimal mengikuti struktur PSAK standar: ASET & BEBAN bersaldo normal
// DEBIT; KEWAJIBAN, EKUITAS & PENDAPATAN bersaldo normal KREDIT. Cukup untuk mencatat transaksi
// kas-basis dari modul Keuangan (pembayaran kuliah, sertifikasi, wisuda, TA/skripsi) sebagai
// Buku Besar & Neraca sederhana — bukan COA lengkap universitas.
const AKUN_LIST = [
  { kode: '1-1001', nama: 'Kas', kategori: 'ASET', saldo_normal: 'DEBIT' },
  { kode: '1-1002', nama: 'Piutang Mahasiswa', kategori: 'ASET', saldo_normal: 'DEBIT' },
  { kode: '2-1001', nama: 'Utang Usaha', kategori: 'KEWAJIBAN', saldo_normal: 'KREDIT' },
  { kode: '3-1001', nama: 'Ekuitas / Modal Yayasan', kategori: 'EKUITAS', saldo_normal: 'KREDIT' },
  { kode: '4-1001', nama: 'Pendapatan Uang Kuliah', kategori: 'PENDAPATAN', saldo_normal: 'KREDIT' },
  { kode: '4-1002', nama: 'Pendapatan Sertifikasi', kategori: 'PENDAPATAN', saldo_normal: 'KREDIT' },
  { kode: '4-1003', nama: 'Pendapatan Wisuda', kategori: 'PENDAPATAN', saldo_normal: 'KREDIT' },
  { kode: '4-1004', nama: 'Pendapatan TA/Skripsi', kategori: 'PENDAPATAN', saldo_normal: 'KREDIT' },
  { kode: '5-1001', nama: 'Beban Operasional', kategori: 'BEBAN', saldo_normal: 'DEBIT' },
];

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();
    await queryInterface.bulkInsert(
      'akun',
      AKUN_LIST.map((akun) => ({ ...akun, is_active: true, created_at: now, updated_at: now }))
    );
  },
  down: async (queryInterface) => {
    await queryInterface.bulkDelete('akun', { kode: AKUN_LIST.map((a) => a.kode) });
  },
};
