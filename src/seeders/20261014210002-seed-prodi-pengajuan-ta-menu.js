'use strict';

// Modul Prodi → Sidang: "Periode Pengajuan TA" (buka/tutup periode) dan "Pengajuan TA/Skripsi"
// (verifikasi pengajuan mahasiswa). Diletakkan di awal grup Sidang.
const PARENT_CODE = 'PRODI_SIDANG_MANAGEMENT';
const MENUS = [
  { name: 'Periode Pengajuan TA', code: 'PRODI_PERIODE_PENGAJUAN_TA_MANAGEMENT', path: '/sidang/periode-pengajuan-ta', icon: 'date_range' },
  { name: 'Pengajuan TA/Skripsi', code: 'PRODI_PENGAJUAN_TA_MANAGEMENT', path: '/sidang/pengajuan-ta', icon: 'assignment_ind' },
];
const ROLES = ['SUPERADMIN', 'PRODI'];

const q = (queryInterface, sql, replacements) => queryInterface.sequelize.query(sql, { replacements }).then(([rows]) => rows);

module.exports = {
  up: async (queryInterface) => {
    const [parent] = await q(queryInterface, 'SELECT id FROM menus WHERE code = :code LIMIT 1', { code: PARENT_CODE });
    if (!parent) throw new Error(`Menu ${PARENT_CODE} tidak ditemukan`);
    const baru = [];
    for (const m of MENUS) {
      const [ada] = await q(queryInterface, 'SELECT id FROM menus WHERE code = :code LIMIT 1', { code: m.code });
      if (!ada) baru.push(m);
    }
    if (!baru.length) return;
    // Geser menu Sidang lain ke bawah supaya menu baru di urutan teratas.
    await q(queryInterface, 'UPDATE menus SET order_number = order_number + :n, updated_at = NOW() WHERE parent_id = :p', {
      n: baru.length,
      p: parent.id,
    });
    const now = new Date();
    const roles = await q(queryInterface, 'SELECT id FROM roles WHERE code IN (:roles)', { roles: ROLES });
    for (const [i, m] of baru.entries()) {
      await queryInterface.bulkInsert('menus', [
        { parent_id: parent.id, ...m, order_number: i + 1, is_active: true, is_public: false, module: 'prodi', created_at: now, updated_at: now },
      ]);
      const [menu] = await q(queryInterface, 'SELECT id FROM menus WHERE code = :code LIMIT 1', { code: m.code });
      if (roles.length) {
        await queryInterface.bulkInsert(
          'role_menu_permissions',
          roles.map((r) => ({ role_id: r.id, menu_id: menu.id, can_create: true, can_read: true, can_update: true, can_delete: true, created_at: now, updated_at: now }))
        );
      }
    }
  },
  down: async (queryInterface) => {
    const menus = await q(queryInterface, 'SELECT id, parent_id FROM menus WHERE code IN (:codes)', { codes: MENUS.map((m) => m.code) });
    if (!menus.length) return;
    await queryInterface.bulkDelete('role_menu_permissions', { menu_id: menus.map((m) => m.id) });
    await queryInterface.bulkDelete('menus', { id: menus.map((m) => m.id) });
    await q(queryInterface, 'UPDATE menus SET order_number = order_number - :n, updated_at = NOW() WHERE parent_id = :p', {
      n: menus.length,
      p: menus[0].parent_id,
    });
  },
};
