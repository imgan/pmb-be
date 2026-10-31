'use strict';

// Modul PMB: menu "Tes Ujian" tepat di bawah "Gelombang", dan "Master Data" dipindah ke paling atas (setelah Dashboard).
// Hak akses Tes Ujian disalin dari hak akses menu Gelombang tiap role.
const MENU = { name: 'Tes Ujian', code: 'TES_UJIAN_MANAGEMENT', path: '/tes-ujian', icon: 'quiz' };
const URUTAN = [
  'DASHBOARD',
  'MASTER_DATA_MANAGEMENT',
  'CALON_MAHASISWA_MANAGEMENT',
  'GELOMBANG_MANAGEMENT',
  'TES_UJIAN_MANAGEMENT',
  'PMB_MASTER_GRAFIK_GROUP_MANAGEMENT',
  'MENU_MANAGEMENT',
  'REPORTING_MANAGEMENT',
  'AUDIT_LOG_MANAGEMENT',
  'README_MANAGEMENT',
];
// Urutan sebelum seeder ini (untuk down).
const URUTAN_LAMA = {
  DASHBOARD: 1,
  CALON_MAHASISWA_MANAGEMENT: 2,
  GELOMBANG_MANAGEMENT: 3,
  PMB_MASTER_GRAFIK_GROUP_MANAGEMENT: 4,
  MENU_MANAGEMENT: 5,
  MASTER_DATA_MANAGEMENT: 6,
  REPORTING_MANAGEMENT: 7,
  AUDIT_LOG_MANAGEMENT: 8,
  README_MANAGEMENT: 9,
};

const q = (queryInterface, sql, replacements) => queryInterface.sequelize.query(sql, { replacements }).then(([rows]) => rows);

const setUrutan = async (queryInterface, urutan) => {
  for (const [code, order] of Object.entries(urutan)) {
    await q(
      queryInterface,
      "UPDATE menus SET order_number = :order, updated_at = NOW() WHERE code = :code AND module = 'pmb' AND parent_id IS NULL AND is_public = false",
      { order, code }
    );
  }
};

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();
    const [existing] = await q(queryInterface, 'SELECT id FROM menus WHERE code = :code LIMIT 1', { code: MENU.code });
    if (!existing) {
      await queryInterface.bulkInsert('menus', [
        { parent_id: null, ...MENU, order_number: 99, is_active: true, is_public: false, module: 'pmb', created_at: now, updated_at: now },
      ]);
      const [menu] = await q(queryInterface, 'SELECT id FROM menus WHERE code = :code LIMIT 1', { code: MENU.code });
      const akses = await q(
        queryInterface,
        "SELECT p.role_id, p.can_create, p.can_read, p.can_update, p.can_delete FROM role_menu_permissions p JOIN menus m ON m.id = p.menu_id WHERE m.code = 'GELOMBANG_MANAGEMENT'"
      );
      if (akses.length) {
        await queryInterface.bulkInsert(
          'role_menu_permissions',
          akses.map((a) => ({ ...a, menu_id: menu.id, created_at: now, updated_at: now }))
        );
      }
    }
    await setUrutan(queryInterface, Object.fromEntries(URUTAN.map((code, i) => [code, i + 1])));
  },
  down: async (queryInterface) => {
    const [menu] = await q(queryInterface, 'SELECT id FROM menus WHERE code = :code LIMIT 1', { code: MENU.code });
    if (menu) {
      await queryInterface.bulkDelete('role_menu_permissions', { menu_id: menu.id });
      await queryInterface.bulkDelete('menus', { id: menu.id });
    }
    await setUrutan(queryInterface, URUTAN_LAMA);
  },
};
