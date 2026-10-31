'use strict';

// Tahun ajaran 2026/2027 Genap (non-aktif) — dibutuhkan import tagihan per semester (tagihan
// semester 8 angkatan 2023 sudah ditagihkan/dibayar di muka). Status aktif tidak diubah.
const ROW = { nama: '2026/2027', tahun_mulai: 2026, tahun_selesai: 2027, jenis_semester: 'GENAP' };

module.exports = {
  up: async (queryInterface) => {
    const [existing] = await queryInterface.sequelize.query(
      'SELECT id FROM tahun_ajaran WHERE nama = :nama AND jenis_semester = :jenis',
      { replacements: { nama: ROW.nama, jenis: ROW.jenis_semester } }
    );
    if (existing.length) return;
    const now = new Date();
    await queryInterface.bulkInsert('tahun_ajaran', [{ ...ROW, is_active: false, is_delete: false, created_at: now, updated_at: now }]);
  },
  down: async (queryInterface) => {
    await queryInterface.bulkDelete('tahun_ajaran', { ...ROW, is_active: false, created_by: null });
  },
};
