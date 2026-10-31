'use strict';

/**
 * Sidebar Prodi: grup "Laporan" setelah "Angket" dengan anak "Laporan OBE". Hak akses disalin dari menu
 * Kelas Kuliah prodi. Urutan grup prodi dinomori ulang (ReadMe & Setting bergeser satu).
 */
const GROUP = { name: 'Laporan', code: 'PRODI_LAPORAN_GROUP_MANAGEMENT', icon: 'summarize' };
const CHILDREN = [{ name: 'Laporan OBE', code: 'PRODI_LAPORAN_OBE_MANAGEMENT', path: '/laporan/obe', icon: 'assessment' }];
const URUTAN = [
  'PRODI_DASHBOARD',
  'PRODI_LULUSAN_MANAGEMENT',
  'PRODI_YUDISIUM_MANAGEMENT',
  'PRODI_SIDANG_MANAGEMENT',
  'PRODI_BIMBINGAN_MANAGEMENT',
  'PRODI_NILAI_MANAGEMENT',
  'PRODI_JADWAL_KULIAH_GROUP_MANAGEMENT',
  'PRODI_PERKULIAHAN_GROUP_MANAGEMENT',
  'PRODI_KURIKULUM_GROUP_MANAGEMENT',
  'PRODI_MAHASISWA_GROUP_MANAGEMENT',
  'PRODI_DOSEN_MANAGEMENT',
  'PRODI_ANGKET_GROUP_MANAGEMENT',
  GROUP.code,
  'PRODI_README_MANAGEMENT',
  'PRODI_SETTING_MANAGEMENT',
];

module.exports = {
  up: async (queryInterface) => {
    const q = (sql, replacements) => queryInterface.sequelize.query(sql, { replacements, type: queryInterface.sequelize.QueryTypes.SELECT });
    const [existing] = await q('SELECT id FROM menus WHERE code = :code LIMIT 1', { code: GROUP.code });
    if (existing) return;

    const now = new Date();
    const baris = (m, parentId, order) => ({
      parent_id: parentId,
      path: null,
      ...m,
      order_number: order,
      is_active: true,
      is_public: false,
      module: 'prodi',
      created_at: now,
      updated_at: now,
    });
    await queryInterface.bulkInsert('menus', [baris(GROUP, null, 0)]);
    const [group] = await q('SELECT id FROM menus WHERE code = :code LIMIT 1', { code: GROUP.code });
    await queryInterface.bulkInsert('menus', CHILDREN.map((c, i) => baris(c, group.id, i + 1)));

    for (const [i, code] of URUTAN.entries()) {
      await queryInterface.sequelize.query("UPDATE menus SET order_number = :order, updated_at = NOW() WHERE module = 'prodi' AND parent_id IS NULL AND code = :code", {
        replacements: { order: i + 1, code },
      });
    }

    const perms = await q(
      `SELECT p.role_id, p.can_create, p.can_read, p.can_update, p.can_delete
         FROM role_menu_permissions p JOIN menus m ON m.id = p.menu_id WHERE m.code = 'PRODI_KELAS_KULIAH_MANAGEMENT'`
    );
    if (!perms.length) return;
    const menus = await q('SELECT id FROM menus WHERE code IN (:codes)', { codes: [GROUP.code, ...CHILDREN.map((c) => c.code)] });
    await queryInterface.bulkInsert(
      'role_menu_permissions',
      menus.flatMap((m) => perms.map((p) => ({ ...p, menu_id: m.id, created_at: now, updated_at: now })))
    );
  },

  down: async (queryInterface) => {
    const q = (sql, replacements) => queryInterface.sequelize.query(sql, { replacements, type: queryInterface.sequelize.QueryTypes.SELECT });
    const menus = await q('SELECT id FROM menus WHERE code IN (:codes)', { codes: [GROUP.code, ...CHILDREN.map((c) => c.code)] });
    if (!menus.length) return;
    const ids = menus.map((m) => m.id);
    await queryInterface.bulkDelete('role_menu_permissions', { menu_id: ids });
    await queryInterface.bulkDelete('menus', { id: ids });
  },
};
