'use strict';

const CHILDREN = [
  { name: 'Buku Besar', code: 'KEUANGAN_BUKU_BESAR_MANAGEMENT', path: '/akuntansi/buku-besar', icon: 'menu_book' },
  { name: 'Neraca', code: 'KEUANGAN_NERACA_MANAGEMENT', path: '/akuntansi/neraca', icon: 'balance' },
];

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();

    await queryInterface.bulkInsert('menus', [
      {
        parent_id: null,
        name: 'Akuntansi',
        code: 'KEUANGAN_AKUNTANSI_GROUP_MANAGEMENT',
        path: null,
        icon: 'account_balance',
        order_number: 5,
        is_active: true,
        is_public: false,
        module: 'keuangan',
        created_at: now,
        updated_at: now,
      },
    ]);

    const [rows] = await queryInterface.sequelize.query(
      "SELECT id FROM menus WHERE code = 'KEUANGAN_AKUNTANSI_GROUP_MANAGEMENT' LIMIT 1"
    );
    const groupId = rows[0].id;

    await queryInterface.bulkInsert(
      'menus',
      CHILDREN.map((child, index) => ({
        parent_id: groupId,
        name: child.name,
        code: child.code,
        path: child.path,
        icon: child.icon,
        order_number: index + 1,
        is_active: true,
        is_public: false,
        module: 'keuangan',
        created_at: now,
        updated_at: now,
      }))
    );

    const [roles] = await queryInterface.sequelize.query("SELECT id FROM roles WHERE code = 'SUPERADMIN' LIMIT 1");
    const allCodes = ['KEUANGAN_AKUNTANSI_GROUP_MANAGEMENT', ...CHILDREN.map((c) => c.code)];
    const [menus] = await queryInterface.sequelize.query(
      `SELECT id FROM menus WHERE code IN (${allCodes.map((c) => `'${c}'`).join(', ')})`
    );
    await queryInterface.bulkInsert(
      'role_menu_permissions',
      menus.map((menu) => ({
        role_id: roles[0].id,
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
    const allCodes = ['KEUANGAN_AKUNTANSI_GROUP_MANAGEMENT', ...CHILDREN.map((c) => c.code)];
    const [menus] = await queryInterface.sequelize.query(
      `SELECT id FROM menus WHERE code IN (${allCodes.map((c) => `'${c}'`).join(', ')})`
    );
    if (menus.length) {
      await queryInterface.bulkDelete('role_menu_permissions', { menu_id: menus.map((m) => m.id) });
    }
    await queryInterface.bulkDelete('menus', { code: CHILDREN.map((c) => c.code) });
    await queryInterface.bulkDelete('menus', { code: ['KEUANGAN_AKUNTANSI_GROUP_MANAGEMENT'] });
  },
};
