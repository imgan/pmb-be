'use strict';

// Menu ReadMe (panduan) untuk modul Keuangan, LMS, dan Admin; diletakkan paling bawah sidebar tiap modul.
// Hak akses: hanya Lihat, untuk setiap role yang bisa membuka modul tersebut.
const MENU = [
  { name: 'ReadMe', code: 'KEUANGAN_README_MANAGEMENT', path: '/readme', icon: 'menu_book', module: 'keuangan' },
  { name: 'ReadMe', code: 'LMS_README_MANAGEMENT', path: '/readme', icon: 'menu_book', module: 'lms' },
  { name: 'ReadMe', code: 'ADMIN_README_MANAGEMENT', path: '/readme', icon: 'menu_book', module: 'admin' },
];

module.exports = {
  up: async (queryInterface) => {
    const q = (sql, replacements) => queryInterface.sequelize.query(sql, { replacements }).then(([rows]) => rows);
    const now = new Date();
    for (const m of MENU) {
      if ((await q('SELECT id FROM menus WHERE code = :code LIMIT 1', { code: m.code })).length) continue;
      const [{ urutan }] = await q('SELECT COALESCE(MAX(order_number), 0) + 1 AS urutan FROM menus WHERE module = :module AND parent_id IS NULL', { module: m.module });
      await queryInterface.bulkInsert('menus', [
        { parent_id: null, ...m, order_number: urutan, is_active: true, is_public: false, created_at: now, updated_at: now },
      ]);
      const [menu] = await q('SELECT id FROM menus WHERE code = :code LIMIT 1', { code: m.code });
      const roles = await q(
        'SELECT DISTINCT p.role_id FROM role_menu_permissions p JOIN menus x ON x.id = p.menu_id WHERE x.module = :module AND p.can_read = 1',
        { module: m.module }
      );
      if (roles.length) {
        await queryInterface.bulkInsert(
          'role_menu_permissions',
          roles.map((r) => ({ role_id: r.role_id, menu_id: menu.id, can_create: false, can_read: true, can_update: false, can_delete: false, created_at: now, updated_at: now }))
        );
      }
    }
  },

  down: async (queryInterface) => {
    const codes = MENU.map((m) => m.code);
    await queryInterface.sequelize.query('DELETE p FROM role_menu_permissions p JOIN menus m ON m.id = p.menu_id WHERE m.code IN (:codes)', { replacements: { codes } });
    await queryInterface.sequelize.query('DELETE FROM menus WHERE code IN (:codes)', { replacements: { codes } });
  },
};
