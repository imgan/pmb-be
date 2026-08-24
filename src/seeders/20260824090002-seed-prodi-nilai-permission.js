'use strict';

const MENU_CODES = [
  'PRODI_NILAI_MANAGEMENT',
  'PRODI_NILAI_PERKELAS_MANAGEMENT',
  'PRODI_NILAI_MAHASISWA_MANAGEMENT',
  'PRODI_NILAI_MAGANG_MANAGEMENT',
  'PRODI_KONVERSI_NILAI_MANAGEMENT',
  'PRODI_PENGHAPUSAN_NILAI_MANAGEMENT',
  'PRODI_UPDATE_NILAI_MANAGEMENT',
  'PRODI_VOC_DOSEN_FTID_MANAGEMENT',
  'PRODI_BOBOT_OBE_MANAGEMENT',
  'PRODI_VOC_UJIAN_FTID_MANAGEMENT',
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
