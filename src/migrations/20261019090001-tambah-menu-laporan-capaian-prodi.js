'use strict';

/**
 * Menu Prodi → Kurikulum → Laporan Capaian OBE (laporan CPL per mata kuliah, dst). Hak akses disalin dari
 * menu Manajemen Capaian.
 */
const MENU = { name: 'Laporan Capaian OBE', code: 'PRODI_LAPORAN_CAPAIAN_MANAGEMENT', path: '/kurikulum/laporan-capaian', icon: 'assessment' };

module.exports = {
  up: async (queryInterface) => {
    const q = (sql, replacements) => queryInterface.sequelize.query(sql, { replacements, type: queryInterface.sequelize.QueryTypes.SELECT });
    const [existing] = await q('SELECT id FROM menus WHERE code = :code LIMIT 1', { code: MENU.code });
    if (existing) return;
    const [group] = await q("SELECT id FROM menus WHERE code = 'PRODI_KURIKULUM_GROUP_MANAGEMENT' LIMIT 1");
    if (!group) return;
    const [last] = await q('SELECT MAX(order_number) AS n FROM menus WHERE parent_id = :parent', { parent: group.id });
    const now = new Date();
    await queryInterface.bulkInsert('menus', [
      { parent_id: group.id, ...MENU, order_number: (last?.n ?? 0) + 1, is_active: true, is_public: false, module: 'prodi', created_at: now, updated_at: now },
    ]);
    const [menu] = await q('SELECT id FROM menus WHERE code = :code LIMIT 1', { code: MENU.code });
    const perms = await q(
      `SELECT p.role_id, p.can_create, p.can_read, p.can_update, p.can_delete
         FROM role_menu_permissions p JOIN menus m ON m.id = p.menu_id WHERE m.code = 'PRODI_MANAJEMEN_CAPAIAN_MANAGEMENT'`
    );
    if (perms.length) {
      await queryInterface.bulkInsert('role_menu_permissions', perms.map((p) => ({ ...p, menu_id: menu.id, created_at: now, updated_at: now })));
    }
  },

  down: async (queryInterface) => {
    const q = (sql, replacements) => queryInterface.sequelize.query(sql, { replacements, type: queryInterface.sequelize.QueryTypes.SELECT });
    const [menu] = await q('SELECT id FROM menus WHERE code = :code LIMIT 1', { code: MENU.code });
    if (!menu) return;
    await queryInterface.bulkDelete('role_menu_permissions', { menu_id: menu.id });
    await queryInterface.bulkDelete('menus', { id: menu.id });
  },
};
