'use strict';

// Grup "Master" (grafik PMB) di sidebar modul PMB, tepat setelah Dashboard. Menu admin PMB
// lain (non-publik, urutan >= 2) digeser satu ke bawah.
const GROUP = { name: 'Master', code: 'PMB_MASTER_GRAFIK_GROUP_MANAGEMENT', icon: 'bar_chart', orderNumber: 2 };
const CHILDREN = [
  { name: 'Grafik Tahunan', code: 'PMB_GRAFIK_TAHUNAN_MANAGEMENT', path: '/grafik/tahunan', icon: 'show_chart' },
  { name: 'Grafik Banding', code: 'PMB_GRAFIK_BANDING_MANAGEMENT', path: '/grafik/banding', icon: 'compare_arrows' },
  { name: 'Grafik Daftar Ulang', code: 'PMB_GRAFIK_DAFTAR_ULANG_MANAGEMENT', path: '/grafik/daftar-ulang', icon: 'how_to_reg' },
];
const CODES = [GROUP.code, ...CHILDREN.map((c) => c.code)];

const q = (queryInterface, sql, replacements) => queryInterface.sequelize.query(sql, { replacements }).then(([rows]) => rows);

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();
    const [existing] = await q(queryInterface, 'SELECT id FROM menus WHERE code = :code LIMIT 1', { code: GROUP.code });
    if (existing) return;

    await queryInterface.sequelize.query(
      "UPDATE menus SET order_number = order_number + 1, updated_at = NOW() WHERE module = 'pmb' AND parent_id IS NULL AND is_public = 0 AND order_number >= :order",
      { replacements: { order: GROUP.orderNumber } }
    );

    await queryInterface.bulkInsert('menus', [
      {
        parent_id: null,
        name: GROUP.name,
        code: GROUP.code,
        path: null,
        icon: GROUP.icon,
        order_number: GROUP.orderNumber,
        is_active: true,
        is_public: false,
        module: 'pmb',
        created_at: now,
        updated_at: now,
      },
    ]);
    const [group] = await q(queryInterface, 'SELECT id FROM menus WHERE code = :code LIMIT 1', { code: GROUP.code });
    await queryInterface.bulkInsert(
      'menus',
      CHILDREN.map((c, i) => ({
        parent_id: group.id,
        name: c.name,
        code: c.code,
        path: c.path,
        icon: c.icon,
        order_number: i + 1,
        is_active: true,
        is_public: false,
        module: 'pmb',
        created_at: now,
        updated_at: now,
      }))
    );

    // Hak akses: SUPERADMIN, ADMIN (role PMB bawaan), serta role dummy PT & PMB bila ada.
    const roles = await q(queryInterface, "SELECT id FROM roles WHERE code IN ('SUPERADMIN', 'ADMIN', 'PT', 'PMB')");
    const menus = await q(queryInterface, 'SELECT id FROM menus WHERE code IN (:codes)', { codes: CODES });
    await queryInterface.bulkInsert(
      'role_menu_permissions',
      roles.flatMap((r) =>
        menus.map((m) => ({
          role_id: r.id,
          menu_id: m.id,
          can_create: true,
          can_read: true,
          can_update: true,
          can_delete: true,
          created_at: now,
          updated_at: now,
        }))
      )
    );
  },
  down: async (queryInterface) => {
    const menus = await q(queryInterface, 'SELECT id FROM menus WHERE code IN (:codes)', { codes: CODES });
    if (!menus.length) return;
    await queryInterface.bulkDelete('role_menu_permissions', { menu_id: menus.map((m) => m.id) });
    await queryInterface.bulkDelete('menus', { code: CHILDREN.map((c) => c.code) });
    await queryInterface.bulkDelete('menus', { code: [GROUP.code] });
    await queryInterface.sequelize.query(
      "UPDATE menus SET order_number = order_number - 1, updated_at = NOW() WHERE module = 'pmb' AND parent_id IS NULL AND is_public = 0 AND order_number > :order",
      { replacements: { order: GROUP.orderNumber } }
    );
  },
};
