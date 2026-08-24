'use strict';

const ROWS = [
  { nama: '2025/2026', tahunMulai: 2025, tahunSelesai: 2026, isActive: false },
  { nama: '2026/2027', tahunMulai: 2026, tahunSelesai: 2027, isActive: true },
];

module.exports = {
  up: async (queryInterface) => {
    const [users] = await queryInterface.sequelize.query("SELECT id FROM users WHERE username = 'superadmin' LIMIT 1");
    const actorId = users.length ? users[0].id : null;
    const now = new Date();

    await queryInterface.bulkInsert(
      'tahun_ajaran',
      ROWS.map((r) => ({
        nama: r.nama,
        tahun_mulai: r.tahunMulai,
        tahun_selesai: r.tahunSelesai,
        is_active: r.isActive,
        is_delete: false,
        created_by: actorId,
        updated_by: actorId,
        created_at: now,
        updated_at: now,
      }))
    );
  },
  down: async (queryInterface) => {
    await queryInterface.bulkDelete('tahun_ajaran', { nama: ROWS.map((r) => r.nama) });
  },
};
