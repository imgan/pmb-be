'use strict';

// Menu "Masa Studi" di modul BAAK (halaman sama dengan Prodi > Masa Studi), tepat setelah Mahasiswa.
const MENU = { name: 'Masa Studi', code: 'BAAK_MASA_STUDI_MANAGEMENT', path: '/masa-studi', icon: 'hourglass_bottom' };
const ROLES = ['SUPERADMIN', 'BAAK', 'PT', 'DIREKTUR', 'WADIR'];

const q = (queryInterface, sql, replacements) => queryInterface.sequelize.query(sql, { replacements }).then(([rows]) => rows);

module.exports = {
  up: async (queryInterface) => {
    const [existing] = await q(queryInterface, 'SELECT id FROM menus WHERE code = :code LIMIT 1', { code: MENU.code });
    if (existing) return;
    const [mahasiswa] = await q(queryInterface, "SELECT order_number FROM menus WHERE code = 'MAHASISWA_MANAGEMENT' LIMIT 1");
    const order = (mahasiswa?.order_number ?? 2) + 1;
    await q(
      queryInterface,
      "UPDATE menus SET order_number = order_number + 1, updated_at = NOW() WHERE module = 'baak' AND parent_id IS NULL AND order_number >= :order",
      { order }
    );
    const now = new Date();
    await queryInterface.bulkInsert('menus', [
      { parent_id: null, ...MENU, order_number: order, is_active: true, is_public: false, module: 'baak', created_at: now, updated_at: now },
    ]);
    const [menu] = await q(queryInterface, 'SELECT id FROM menus WHERE code = :code LIMIT 1', { code: MENU.code });
    const roles = await q(queryInterface, 'SELECT id FROM roles WHERE code IN (:roles)', { roles: ROLES });
    if (roles.length) {
      await queryInterface.bulkInsert(
        'role_menu_permissions',
        roles.map((r) => ({ role_id: r.id, menu_id: menu.id, can_create: true, can_read: true, can_update: true, can_delete: true, created_at: now, updated_at: now }))
      );
    }
  },
  down: async (queryInterface) => {
    const [menu] = await q(queryInterface, 'SELECT id, order_number FROM menus WHERE code = :code LIMIT 1', { code: MENU.code });
    if (!menu) return;
    await queryInterface.bulkDelete('role_menu_permissions', { menu_id: menu.id });
    await queryInterface.bulkDelete('menus', { id: menu.id });
    await q(
      queryInterface,
      "UPDATE menus SET order_number = order_number - 1, updated_at = NOW() WHERE module = 'baak' AND parent_id IS NULL AND order_number > :order",
      { order: menu.order_number }
    );
  },
};
