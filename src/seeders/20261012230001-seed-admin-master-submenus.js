'use strict';

// Modul Admin → Master: sub menu lain (setelah Ruangan) mengikuti susunan menu Master di SMART lama.
// Halamannya sementara "Segera Hadir"; CRUD dibuat bertahap.
const PARENT_CODE = 'ADMIN_MASTER_GROUP_MANAGEMENT';
const MENUS = [
  { name: 'Agama', code: 'ADMIN_MASTER_AGAMA_MANAGEMENT', path: '/master/agama', icon: 'church' },
  { name: 'Tahun (Prodi, BAAK, MHS, Dosen, Pos & SDM)', code: 'ADMIN_MASTER_TAHUN_AKADEMIK_MANAGEMENT', path: '/master/tahun', icon: 'calendar_month' },
  { name: 'Tahun (Kasir & Keuangan)', code: 'ADMIN_MASTER_TAHUN_KEUANGAN_MANAGEMENT', path: '/master/tahun-keuangan', icon: 'calendar_month' },
  { name: 'Tahun (PMB)', code: 'ADMIN_MASTER_TAHUN_PMB_MANAGEMENT', path: '/master/tahun-pmb', icon: 'calendar_month' },
  { name: 'Tahun (FRS)', code: 'ADMIN_MASTER_TAHUN_FRS_MANAGEMENT', path: '/master/tahun-frs', icon: 'calendar_month' },
  { name: 'Tahun TA/Skripsi', code: 'ADMIN_MASTER_TAHUN_TA_SKRIPSI_MANAGEMENT', path: '/master/tahun-ta-skripsi', icon: 'calendar_month' },
  { name: 'Tahun SP', code: 'ADMIN_MASTER_TAHUN_SP_MANAGEMENT', path: '/master/tahun-sp', icon: 'calendar_month' },
  { name: 'Prodi', code: 'ADMIN_MASTER_PRODI_MANAGEMENT', path: '/master/prodi', icon: 'account_tree' },
  { name: 'Karyawan', code: 'ADMIN_MASTER_KARYAWAN_MANAGEMENT', path: '/master/karyawan', icon: 'badge' },
  { name: 'Dosen', code: 'ADMIN_MASTER_DOSEN_MANAGEMENT', path: '/master/dosen', icon: 'co_present' },
  { name: 'Mahasiswa', code: 'ADMIN_MASTER_MAHASISWA_MANAGEMENT', path: '/master/mahasiswa', icon: 'school' },
];
const ROLES = ['SUPERADMIN'];

const q = (queryInterface, sql, replacements) => queryInterface.sequelize.query(sql, { replacements }).then(([rows]) => rows);

module.exports = {
  up: async (queryInterface) => {
    const [parent] = await q(queryInterface, 'SELECT id FROM menus WHERE code = :code LIMIT 1', { code: PARENT_CODE });
    if (!parent) throw new Error(`Menu ${PARENT_CODE} belum ada; jalankan seeder 20261012220002 dulu`);
    const roles = await q(queryInterface, 'SELECT id FROM roles WHERE code IN (:roles)', { roles: ROLES });
    const now = new Date();
    for (const [i, menu] of MENUS.entries()) {
      const [existing] = await q(queryInterface, 'SELECT id FROM menus WHERE code = :code LIMIT 1', { code: menu.code });
      if (existing) continue;
      // Ruangan = urutan 1, sisanya menyusul.
      await queryInterface.bulkInsert('menus', [
        { parent_id: parent.id, ...menu, order_number: i + 2, is_active: true, is_public: false, module: 'admin', created_at: now, updated_at: now },
      ]);
      const [row] = await q(queryInterface, 'SELECT id FROM menus WHERE code = :code LIMIT 1', { code: menu.code });
      if (roles.length) {
        await queryInterface.bulkInsert(
          'role_menu_permissions',
          roles.map((r) => ({ role_id: r.id, menu_id: row.id, can_create: true, can_read: true, can_update: true, can_delete: true, created_at: now, updated_at: now }))
        );
      }
    }
  },
  down: async (queryInterface) => {
    const menus = await q(queryInterface, 'SELECT id FROM menus WHERE code IN (:codes)', { codes: MENUS.map((m) => m.code) });
    if (!menus.length) return;
    const ids = menus.map((m) => m.id);
    await queryInterface.bulkDelete('role_menu_permissions', { menu_id: ids });
    await queryInterface.bulkDelete('menus', { id: ids });
  },
};
