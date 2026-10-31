'use strict';

// Menu "Angket Pelayanan" (hasil angket pelayanan mahasiswa) di modul Prodi, sebelum ReadMe.
const MENU = { name: 'Angket Pelayanan', code: 'PRODI_ANGKET_PELAYANAN_MANAGEMENT', path: '/angket-pelayanan', icon: 'reviews' };
const ROLES = ['SUPERADMIN', 'ADMIN', 'PT', 'DIREKTUR', 'WADIR', 'PRODI'];

const q = (queryInterface, sql, replacements) => queryInterface.sequelize.query(sql, { replacements }).then(([rows]) => rows);

module.exports = {
  up: async (queryInterface) => {
    const [existing] = await q(queryInterface, 'SELECT id FROM menus WHERE code = :code LIMIT 1', { code: MENU.code });
    if (existing) return;
    const [readme] = await q(queryInterface, "SELECT order_number FROM menus WHERE code = 'PRODI_README_MANAGEMENT' LIMIT 1");
    const order = readme?.order_number ?? 9;
    await q(
      queryInterface,
      "UPDATE menus SET order_number = order_number + 1, updated_at = NOW() WHERE module = 'prodi' AND parent_id IS NULL AND order_number >= :order",
      { order }
    );
    const now = new Date();
    await queryInterface.bulkInsert('menus', [
      { parent_id: null, ...MENU, order_number: order, is_active: true, is_public: false, module: 'prodi', created_at: now, updated_at: now },
    ]);
    const [menu] = await q(queryInterface, 'SELECT id FROM menus WHERE code = :code LIMIT 1', { code: MENU.code });
    const roles = await q(queryInterface, 'SELECT id FROM roles WHERE code IN (:roles)', { roles: ROLES });
    if (roles.length) {
      await queryInterface.bulkInsert(
        'role_menu_permissions',
        roles.map((r) => ({
          role_id: r.id,
          menu_id: menu.id,
          can_create: false,
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
    const [menu] = await q(queryInterface, 'SELECT id, order_number FROM menus WHERE code = :code LIMIT 1', { code: MENU.code });
    if (!menu) return;
    await queryInterface.bulkDelete('role_menu_permissions', { menu_id: menu.id });
    await queryInterface.bulkDelete('menus', { id: menu.id });
    await q(
      queryInterface,
      "UPDATE menus SET order_number = order_number - 1, updated_at = NOW() WHERE module = 'prodi' AND parent_id IS NULL AND order_number > :order",
      { order: menu.order_number }
    );
  },
};
