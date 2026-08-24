'use strict';

const MENU_CODES = [
  'PRODI_JADWAL_KULIAH_GROUP_MANAGEMENT',
  'PRODI_REALISASI_DOSEN_MANAGEMENT',
  'PRODI_MONITORING_JADWAL_MANAGEMENT',
  'PRODI_JADWAL_KULIAH_MANAGEMENT',
  'PRODI_JADWAL_UJIAN_MANAGEMENT',
];

module.exports = {
  up: async (queryInterface) => {
    const [roles] = await queryInterface.sequelize.query("SELECT id FROM roles WHERE code = 'SUPERADMIN' LIMIT 1");
    const [menus] = await queryInterface.sequelize.query(
      `SELECT id FROM menus WHERE code IN (${MENU_CODES.map((c) => `'${c}'`).join(', ')})`
    );

    const roleId = roles[0].id;
    const now = new Date();

    await queryInterface.bulkInsert(
      'role_menu_permissions',
      menus.map((menu) => ({
        role_id: roleId,
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
    const [menus] = await queryInterface.sequelize.query(
      `SELECT id FROM menus WHERE code IN (${MENU_CODES.map((c) => `'${c}'`).join(', ')})`
    );
    if (menus.length) {
      await queryInterface.bulkDelete('role_menu_permissions', { menu_id: menus.map((m) => m.id) });
    }
  },
};
