'use strict';

const MENU_CODES = [
  'SIM_DASHBOARD',
  'SIM_MASTER_GROUP_MANAGEMENT',
  'SIM_STUDENT_BODY_MANAGEMENT',
  'SIM_PRESENTASE_KEHADIRAN_MANAGEMENT',
  'SIM_KEHADIRAN_KELAS_MANAGEMENT',
  'SIM_FRS_MANAGEMENT',
  'SIM_UJIAN_MANAGEMENT',
  'SIM_AKTIF_MANAGEMENT',
  'SIM_IPK_MANAGEMENT',
  'SIM_LULUSAN_MANAGEMENT',
  'SIM_NILAI_D_E_MANAGEMENT',
  'SIM_TRANSAKSI_MANAGEMENT',
  'SIM_FEEDER_MANAGEMENT',
  'SIM_PANDUAN_SMART_MANAGEMENT',
  'SIM_PANDUAN_AKADEMIK_MANAGEMENT',
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
