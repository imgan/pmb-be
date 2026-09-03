'use strict';

const CHILDREN = [
  { name: 'Cetak Kehadiran Mengajar', code: 'SIM_TRANSAKSI_CETAK_KEHADIRAN_MENGAJAR_MANAGEMENT', path: '/transaksi/cetak-kehadiran-mengajar', icon: 'event_available' },
  { name: 'Rekapitulasi Pengajaran', code: 'SIM_TRANSAKSI_REKAPITULASI_PENGAJARAN_MANAGEMENT', path: '/transaksi/rekapitulasi-pengajaran', icon: 'summarize' },
];

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();

    // "Transaksi" (SIM_TRANSAKSI_MANAGEMENT) sebelumnya adalah menu leaf (path '/transaksi')
    // menuju halaman placeholder — sekarang diubah jadi grup (path null) dengan 2 sub-menu,
    // mengikuti pola grup "Master" (SIM_MASTER_GROUP_MANAGEMENT).
    await queryInterface.bulkUpdate('menus', { path: null, updated_at: now }, { code: 'SIM_TRANSAKSI_MANAGEMENT' });

    const [rows] = await queryInterface.sequelize.query(
      "SELECT id FROM menus WHERE code = 'SIM_TRANSAKSI_MANAGEMENT' LIMIT 1"
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
        module: 'sim',
        created_at: now,
        updated_at: now,
      }))
    );

    const [roles] = await queryInterface.sequelize.query("SELECT id FROM roles WHERE code = 'SUPERADMIN' LIMIT 1");
    const [menus] = await queryInterface.sequelize.query(
      `SELECT id FROM menus WHERE code IN (${CHILDREN.map((c) => `'${c.code}'`).join(', ')})`
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
    const [menus] = await queryInterface.sequelize.query(
      `SELECT id FROM menus WHERE code IN (${CHILDREN.map((c) => `'${c.code}'`).join(', ')})`
    );
    if (menus.length) {
      await queryInterface.bulkDelete('role_menu_permissions', { menu_id: menus.map((m) => m.id) });
    }
    await queryInterface.bulkDelete('menus', { code: CHILDREN.map((c) => c.code) });
    await queryInterface.bulkUpdate(
      'menus',
      { path: '/transaksi', updated_at: new Date() },
      { code: 'SIM_TRANSAKSI_MANAGEMENT' }
    );
  },
};
