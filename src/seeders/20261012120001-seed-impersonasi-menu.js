'use strict';

// Menu "Impersonasi Akun" (masuk sebagai akun staff/dosen/mahasiswa) di modul Admin (/modul-admin).
// Hanya SUPERADMIN — akses ini bisa membuka seluruh akun. Butuh migrasi
// 20261012130001-add-admin-to-menus-module-enum (enum module 'admin').
const MENU = { name: 'Impersonasi Akun', code: 'IMPERSONASI_MANAGEMENT', path: '/impersonasi', icon: 'switch_account' };
const ROLES = ['SUPERADMIN'];

const q = (queryInterface, sql, replacements) => queryInterface.sequelize.query(sql, { replacements }).then(([rows]) => rows);

module.exports = {
  up: async (queryInterface) => {
    const [existing] = await q(queryInterface, 'SELECT id FROM menus WHERE code = :code LIMIT 1', { code: MENU.code });
    if (existing) return;
    const order = 1;
    const now = new Date();
    await queryInterface.bulkInsert('menus', [
      { parent_id: null, ...MENU, order_number: order, is_active: true, is_public: false, module: 'admin', created_at: now, updated_at: now },
    ]);
    const [menu] = await q(queryInterface, 'SELECT id FROM menus WHERE code = :code LIMIT 1', { code: MENU.code });
    const roles = await q(queryInterface, 'SELECT id FROM roles WHERE code IN (:roles)', { roles: ROLES });
    if (roles.length) {
      await queryInterface.bulkInsert(
        'role_menu_permissions',
        roles.map((r) => ({
          role_id: r.id,
          menu_id: menu.id,
          can_create: true,
          can_read: true,
          can_update: false,
          can_delete: false,
          created_at: now,
          updated_at: now,
        }))
      );
    }
  },
  down: async (queryInterface) => {
    const [menu] = await q(queryInterface, 'SELECT id FROM menus WHERE code = :code LIMIT 1', { code: MENU.code });
    if (!menu) return;
    await queryInterface.bulkDelete('role_menu_permissions', { menu_id: menu.id });
    await queryInterface.bulkDelete('menus', { id: menu.id });
  },
};
