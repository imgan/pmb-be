'use strict';

module.exports = {
  up: async (queryInterface) => {
    const [roles] = await queryInterface.sequelize.query("SELECT id FROM roles WHERE code = 'SUPERADMIN' LIMIT 1");
    const [menus] = await queryInterface.sequelize.query(
      "SELECT id FROM menus WHERE code = 'JADWAL_KULIAH_MANAGEMENT' LIMIT 1"
    );

    const roleId = roles[0].id;
    const menuId = menus[0].id;
    const now = new Date();

    await queryInterface.bulkInsert('role_menu_permissions', [
      {
        role_id: roleId,
        menu_id: menuId,
        can_create: true,
        can_read: true,
        can_update: true,
        can_delete: true,
        created_at: now,
        updated_at: now,
      },
    ]);
  },
  down: async (queryInterface) => {
    const [menus] = await queryInterface.sequelize.query(
      "SELECT id FROM menus WHERE code = 'JADWAL_KULIAH_MANAGEMENT' LIMIT 1"
    );
    if (menus.length) {
      await queryInterface.bulkDelete('role_menu_permissions', { menu_id: menus[0].id });
    }
  },
};
