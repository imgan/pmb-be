'use strict';

// Menu "KRS Mahasiswa" di modul Prodi (grup yang sama dengan Monitoring FRS, tepat sebelumnya).
// Hak baca mengikuti role yang sudah punya akses Monitoring FRS.
const MENU = { name: 'KRS Mahasiswa', code: 'PRODI_KRS_MANAGEMENT', path: '/mahasiswa/krs', icon: 'assignment' };
const ACUAN = 'PRODI_MONITORING_FRS_MANAGEMENT';

const q = (queryInterface, sql, replacements) => queryInterface.sequelize.query(sql, { replacements }).then(([rows]) => rows);

module.exports = {
  up: async (queryInterface) => {
    const [existing] = await q(queryInterface, 'SELECT id FROM menus WHERE code = :code LIMIT 1', { code: MENU.code });
    if (existing) return;
    const [acuan] = await q(queryInterface, 'SELECT id, parent_id, order_number FROM menus WHERE code = :code LIMIT 1', { code: ACUAN });
    if (!acuan) return;
    await q(
      queryInterface,
      "UPDATE menus SET order_number = order_number + 1, updated_at = NOW() WHERE module = 'prodi' AND parent_id <=> :parentId AND order_number >= :order",
      { parentId: acuan.parent_id, order: acuan.order_number }
    );
    const now = new Date();
    await queryInterface.bulkInsert('menus', [
      { parent_id: acuan.parent_id, ...MENU, order_number: acuan.order_number, is_active: true, is_public: false, module: 'prodi', created_at: now, updated_at: now },
    ]);
    const [menu] = await q(queryInterface, 'SELECT id FROM menus WHERE code = :code LIMIT 1', { code: MENU.code });
    const roles = await q(queryInterface, 'SELECT DISTINCT role_id FROM role_menu_permissions WHERE menu_id = :menuId AND can_read = true', { menuId: acuan.id });
    if (roles.length) {
      await queryInterface.bulkInsert(
        'role_menu_permissions',
        roles.map((r) => ({
          role_id: r.role_id,
          menu_id: menu.id,
          can_create: false,
          can_read: true,
          can_update: false,
          can_delete: false,
          created_at: now,
          updated_at: now,
        }))
      );
    }
  },
  down: async (queryInterface) => {
    const [menu] = await q(queryInterface, 'SELECT id, parent_id, order_number FROM menus WHERE code = :code LIMIT 1', { code: MENU.code });
    if (!menu) return;
    await queryInterface.bulkDelete('role_menu_permissions', { menu_id: menu.id });
    await queryInterface.bulkDelete('menus', { id: menu.id });
    await q(
      queryInterface,
      "UPDATE menus SET order_number = order_number - 1, updated_at = NOW() WHERE module = 'prodi' AND parent_id <=> :parentId AND order_number > :order",
      { parentId: menu.parent_id, order: menu.order_number }
    );
  },
};
