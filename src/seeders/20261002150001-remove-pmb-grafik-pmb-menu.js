'use strict';

// Hapus menu "Grafik PMB" dari grup Master (grafik PMB); menu sesudahnya digeser naik satu urutan.
const MENU = { name: 'Grafik PMB', code: 'PMB_GRAFIK_PMB_MANAGEMENT', path: '/grafik/pmb', icon: 'insights' };

const q = (queryInterface, sql, replacements) => queryInterface.sequelize.query(sql, { replacements }).then(([rows]) => rows);

module.exports = {
  up: async (queryInterface) => {
    const [menu] = await q(queryInterface, 'SELECT id, parent_id, order_number FROM menus WHERE code = :code LIMIT 1', {
      code: MENU.code,
    });
    if (!menu) return;
    await queryInterface.bulkDelete('role_menu_permissions', { menu_id: menu.id });
    await queryInterface.bulkDelete('menus', { id: menu.id });
    await queryInterface.sequelize.query(
      'UPDATE menus SET order_number = order_number - 1, updated_at = NOW() WHERE parent_id = :parentId AND order_number > :order',
      { replacements: { parentId: menu.parent_id, order: menu.order_number } }
    );
  },
  down: async (queryInterface) => {
    const [existing] = await q(queryInterface, 'SELECT id FROM menus WHERE code = :code LIMIT 1', { code: MENU.code });
    if (existing) return;
    const [group] = await q(queryInterface, "SELECT id FROM menus WHERE code = 'PMB_MASTER_GRAFIK_GROUP_MANAGEMENT' LIMIT 1");
    if (!group) return;
    const now = new Date();
    const [{ maxOrder }] = await q(queryInterface, 'SELECT COALESCE(MAX(order_number), 0) AS maxOrder FROM menus WHERE parent_id = :id', {
      id: group.id,
    });
    await queryInterface.bulkInsert('menus', [
      {
        parent_id: group.id,
        name: MENU.name,
        code: MENU.code,
        path: MENU.path,
        icon: MENU.icon,
        order_number: Number(maxOrder) + 1,
        is_active: true,
        is_public: false,
        module: 'pmb',
        created_at: now,
        updated_at: now,
      },
    ]);
    const [menu] = await q(queryInterface, 'SELECT id FROM menus WHERE code = :code LIMIT 1', { code: MENU.code });
    const roles = await q(queryInterface, "SELECT id FROM roles WHERE code IN ('SUPERADMIN', 'ADMIN', 'PT', 'PMB')");
    if (!roles.length) return;
    await queryInterface.bulkInsert(
      'role_menu_permissions',
      roles.map((r) => ({
        role_id: r.id,
        menu_id: menu.id,
        can_create: true,
        can_read: true,
        can_update: true,
        can_delete: true,
        created_at: now,
        updated_at: now,
      }))
    );
  },
};
