'use strict';

// Menu "Tiket Mahasiswa" di modul SIM (sebelum Panduan SMART): petugas memproses pengajuan tiket
// dari portal mahasiswa.
const MENU = { name: 'Tiket Mahasiswa', code: 'SIM_TIKET_MAHASISWA_MANAGEMENT', path: '/tiket-mahasiswa', icon: 'support_agent' };
const ROLES = ['SUPERADMIN', 'SIM'];

const q = (queryInterface, sql, replacements) => queryInterface.sequelize.query(sql, { replacements }).then(([rows]) => rows);

module.exports = {
  up: async (queryInterface) => {
    const [existing] = await q(queryInterface, 'SELECT id FROM menus WHERE code = :code LIMIT 1', { code: MENU.code });
    if (existing) return;
    const [panduan] = await q(queryInterface, "SELECT order_number FROM menus WHERE code = 'SIM_PANDUAN_SMART_MANAGEMENT' LIMIT 1");
    const [last] = await q(queryInterface, "SELECT MAX(order_number) AS n FROM menus WHERE module = 'sim' AND parent_id IS NULL");
    const order = panduan?.order_number ?? (last?.n ?? 0) + 1;
    await q(
      queryInterface,
      "UPDATE menus SET order_number = order_number + 1, updated_at = NOW() WHERE module = 'sim' AND parent_id IS NULL AND order_number >= :order",
      { order }
    );
    const now = new Date();
    await queryInterface.bulkInsert('menus', [
      { parent_id: null, ...MENU, order_number: order, is_active: true, is_public: false, module: 'sim', created_at: now, updated_at: now },
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
      "UPDATE menus SET order_number = order_number - 1, updated_at = NOW() WHERE module = 'sim' AND parent_id IS NULL AND order_number > :order",
      { order: menu.order_number }
    );
  },
};
