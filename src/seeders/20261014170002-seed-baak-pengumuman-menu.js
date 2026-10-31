'use strict';

// Menu "Pengumuman" di modul BAAK, sebelum ReadMe: kelola pengumuman yang tampil di portal mahasiswa.
const MENU = { name: 'Pengumuman', code: 'BAAK_PENGUMUMAN_MANAGEMENT', path: '/pengumuman', icon: 'campaign' };
const ROLES = ['SUPERADMIN', 'BAAK'];

const q = (queryInterface, sql, replacements) => queryInterface.sequelize.query(sql, { replacements }).then(([rows]) => rows);

module.exports = {
  up: async (queryInterface) => {
    const [existing] = await q(queryInterface, 'SELECT id FROM menus WHERE code = :code LIMIT 1', { code: MENU.code });
    if (existing) return;
    const [readme] = await q(queryInterface, "SELECT order_number FROM menus WHERE code = 'BAAK_README_MANAGEMENT' LIMIT 1");
    const [last] = await q(queryInterface, "SELECT MAX(order_number) AS n FROM menus WHERE module = 'baak' AND parent_id IS NULL");
    const order = readme?.order_number ?? (last?.n ?? 0) + 1;
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
