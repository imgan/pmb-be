'use strict';

module.exports = {
  up: async (queryInterface) => {
    const [roles] = await queryInterface.sequelize.query("SELECT id FROM roles WHERE code = 'SUPERADMIN' LIMIT 1");
    const [menus] = await queryInterface.sequelize.query(
      "SELECT id FROM menus WHERE code IN ('GOLONGAN_KELAS_MANAGEMENT', 'JURUSAN_MANAGEMENT')"
    );

    const roleId = roles[0].id;
    const now = new Date();

    const rows = menus.map((menu) => ({
      role_id: roleId,
      menu_id: menu.id,
      can_create: true,
      can_read: true,
      can_update: true,
      can_delete: true,
      created_at: now,
      updated_at: now,
    }));

    await queryInterface.bulkInsert('role_menu_permissions', rows);
  },
  down: async (queryInterface) => {
    const [menus] = await queryInterface.sequelize.query(
      "SELECT id FROM menus WHERE code IN ('GOLONGAN_KELAS_MANAGEMENT', 'JURUSAN_MANAGEMENT')"
    );
    const menuIds = menus.map((m) => m.id);
    if (menuIds.length) {
      await queryInterface.bulkDelete('role_menu_permissions', { menu_id: menuIds });
    }
  },
};
