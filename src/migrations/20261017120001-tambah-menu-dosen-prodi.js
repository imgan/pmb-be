'use strict';

/**
 * Menu "Dosen" di sidebar Prodi (setelah grup Mahasiswa): daftar dosen homebase / pengajar prodi sesi
 * (lihat saja). Hak baca diberikan ke role yang punya akses Beranda prodi.
 */
const MENU = { name: 'Dosen', code: 'PRODI_DOSEN_MANAGEMENT', path: '/dosen', icon: 'badge' };

module.exports = {
  up: async (queryInterface) => {
    const q = (sql, replacements) => queryInterface.sequelize.query(sql, { replacements, type: queryInterface.sequelize.QueryTypes.SELECT });
    const [existing] = await q('SELECT id FROM menus WHERE code = :code LIMIT 1', { code: MENU.code });
    if (existing) return;
    const [mahasiswa] = await q("SELECT order_number FROM menus WHERE code = 'PRODI_MAHASISWA_GROUP_MANAGEMENT' LIMIT 1");
    const order = (mahasiswa?.order_number ?? 8) + 1;
    await queryInterface.sequelize.query(
      "UPDATE menus SET order_number = order_number + 1, updated_at = NOW() WHERE module = 'prodi' AND parent_id IS NULL AND order_number >= :order",
      { replacements: { order } }
    );
    const now = new Date();
    await queryInterface.bulkInsert('menus', [
      { parent_id: null, ...MENU, order_number: order, is_active: true, is_public: false, module: 'prodi', created_at: now, updated_at: now },
    ]);
    const [menu] = await q('SELECT id FROM menus WHERE code = :code LIMIT 1', { code: MENU.code });
    const roles = await q(
      "SELECT DISTINCT p.role_id FROM role_menu_permissions p JOIN menus m ON m.id = p.menu_id WHERE m.code = 'PRODI_DASHBOARD' AND p.can_read = 1"
    );
    if (roles.length) {
      await queryInterface.bulkInsert(
        'role_menu_permissions',
        roles.map((r) => ({ role_id: r.role_id, menu_id: menu.id, can_create: false, can_read: true, can_update: false, can_delete: false, created_at: now, updated_at: now }))
      );
    }
  },

  down: async (queryInterface) => {
    const q = (sql, replacements) => queryInterface.sequelize.query(sql, { replacements, type: queryInterface.sequelize.QueryTypes.SELECT });
    const [menu] = await q('SELECT id, order_number FROM menus WHERE code = :code LIMIT 1', { code: MENU.code });
    if (!menu) return;
    await queryInterface.bulkDelete('role_menu_permissions', { menu_id: menu.id });
    await queryInterface.bulkDelete('menus', { id: menu.id });
    await queryInterface.sequelize.query(
      "UPDATE menus SET order_number = order_number - 1, updated_at = NOW() WHERE module = 'prodi' AND parent_id IS NULL AND order_number > :order",
      { replacements: { order: menu.order_number } }
    );
  },
};
