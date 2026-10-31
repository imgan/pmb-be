'use strict';

// Modul Admin: parent menu "Master" (paling bawah) dengan sub menu "Ruangan".
const PARENT = { name: 'Master', code: 'ADMIN_MASTER_GROUP_MANAGEMENT', path: null, icon: 'database' };
const CHILD = { name: 'Ruangan', code: 'RUANGAN_MANAGEMENT', path: '/master/ruangan', icon: 'meeting_room' };
const ROLES = ['SUPERADMIN'];

const q = (queryInterface, sql, replacements) => queryInterface.sequelize.query(sql, { replacements }).then(([rows]) => rows);

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();
    const insertMenu = async (menu, parentId, order) => {
      const [existing] = await q(queryInterface, 'SELECT id FROM menus WHERE code = :code LIMIT 1', { code: menu.code });
      if (existing) return existing.id;
      await queryInterface.bulkInsert('menus', [
        { parent_id: parentId, ...menu, order_number: order, is_active: true, is_public: false, module: 'admin', created_at: now, updated_at: now },
      ]);
      const [row] = await q(queryInterface, 'SELECT id FROM menus WHERE code = :code LIMIT 1', { code: menu.code });
      const roles = await q(queryInterface, 'SELECT id FROM roles WHERE code IN (:roles)', { roles: ROLES });
      if (roles.length) {
        await queryInterface.bulkInsert(
          'role_menu_permissions',
          roles.map((r) => ({ role_id: r.id, menu_id: row.id, can_create: true, can_read: true, can_update: true, can_delete: true, created_at: now, updated_at: now }))
        );
      }
      return row.id;
    };
    const [last] = await q(queryInterface, "SELECT MAX(order_number) AS n FROM menus WHERE module = 'admin' AND parent_id IS NULL");
    const parentId = await insertMenu(PARENT, null, (last?.n ?? 0) + 1);
    await insertMenu(CHILD, parentId, 1);
  },
  down: async (queryInterface) => {
    const menus = await q(queryInterface, 'SELECT id FROM menus WHERE code IN (:codes)', { codes: [CHILD.code, PARENT.code] });
    if (!menus.length) return;
    await queryInterface.bulkDelete('role_menu_permissions', { menu_id: menus.map((m) => m.id) });
    await q(queryInterface, 'DELETE FROM menus WHERE code = :code', { code: CHILD.code });
    await q(queryInterface, 'DELETE FROM menus WHERE code = :code', { code: PARENT.code });
  },
};
