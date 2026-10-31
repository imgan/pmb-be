'use strict';

// Menu "Batas Tagihan Akademik" di grup Master modul Keuangan, urutan terakhir. Hak akses mengikuti
// menu master Keuangan lain (Tarif TA/Skripsi): SUPERADMIN, KEUANGAN, PT.
const MENU = {
  name: 'Batas Tagihan Akademik',
  code: 'KEUANGAN_BATAS_TAGIHAN_AKADEMIK_MANAGEMENT',
  path: '/master/batas-tagihan-akademik',
  icon: 'rule',
};

const q = (queryInterface, sql, replacements) => queryInterface.sequelize.query(sql, { replacements }).then(([rows]) => rows);

module.exports = {
  up: async (queryInterface) => {
    const [existing] = await q(queryInterface, 'SELECT id FROM menus WHERE code = :code LIMIT 1', { code: MENU.code });
    if (existing) return;
    const [group] = await q(queryInterface, "SELECT id FROM menus WHERE code = 'KEUANGAN_MASTER_GROUP_MANAGEMENT' LIMIT 1");
    if (!group) return;
    const [{ maxOrder }] = await q(queryInterface, 'SELECT COALESCE(MAX(order_number), 0) AS maxOrder FROM menus WHERE parent_id = :id', {
      id: group.id,
    });

    const now = new Date();
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
        module: 'keuangan',
        created_at: now,
        updated_at: now,
      },
    ]);
    const [menu] = await q(queryInterface, 'SELECT id FROM menus WHERE code = :code LIMIT 1', { code: MENU.code });

    const roles = await q(queryInterface, "SELECT id FROM roles WHERE code IN ('SUPERADMIN', 'KEUANGAN', 'PT')");
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
  down: async (queryInterface) => {
    const [menu] = await q(queryInterface, 'SELECT id FROM menus WHERE code = :code LIMIT 1', { code: MENU.code });
    if (!menu) return;
    await queryInterface.bulkDelete('role_menu_permissions', { menu_id: menu.id });
    await queryInterface.bulkDelete('menus', { id: menu.id });
  },
};
