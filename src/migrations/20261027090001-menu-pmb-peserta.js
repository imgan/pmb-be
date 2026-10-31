'use strict';

/**
 * Sidebar PMB: grup "Informasi" dihapus.
 * - "Data Calon Mahasiswa Baru" menjadi menu utama "Peserta", tepat setelah Dashboard.
 * - "Biaya Kuliah" (/pembayaran) pindah ke grup Master Data.
 * Kode menu tetap, jadi hak akses role tidak berubah.
 */
const URUTAN = [
  'DASHBOARD',
  'CALON_MAHASISWA_MANAGEMENT',
  'PMB_MASTER_GRAFIK_GROUP_MANAGEMENT',
  'MENU_MANAGEMENT',
  'MASTER_DATA_MANAGEMENT',
  'REPORTING_MANAGEMENT',
  'AUDIT_LOG_MANAGEMENT',
  'README_MANAGEMENT',
];

module.exports = {
  up: async (queryInterface) => {
    const q = (sql, replacements) => queryInterface.sequelize.query(sql, { replacements, type: queryInterface.sequelize.QueryTypes.SELECT });
    const run = (sql, replacements) => queryInterface.sequelize.query(sql, { replacements });
    const [master] = await q("SELECT id FROM menus WHERE code = 'MASTER_DATA_MANAGEMENT' LIMIT 1");
    const [maks] = await q('SELECT COALESCE(MAX(order_number), 0) AS n FROM menus WHERE parent_id = :id', { id: master.id });

    await run("UPDATE menus SET name = 'Peserta', parent_id = NULL, updated_at = NOW() WHERE code = 'CALON_MAHASISWA_MANAGEMENT'");
    await run("UPDATE menus SET parent_id = :parent, order_number = :order, updated_at = NOW() WHERE code = 'PEMBAYARAN_MANAGEMENT'", {
      parent: master.id,
      order: Number(maks.n) + 1,
    });
    await run("DELETE FROM menus WHERE code = 'INFORMASI_MANAGEMENT'");

    for (const [i, code] of URUTAN.entries()) {
      await run("UPDATE menus SET order_number = :order, updated_at = NOW() WHERE module = 'pmb' AND parent_id IS NULL AND code = :code", { order: i + 1, code });
    }
  },

  down: async (queryInterface) => {
    const q = (sql, replacements) => queryInterface.sequelize.query(sql, { replacements, type: queryInterface.sequelize.QueryTypes.SELECT });
    const run = (sql, replacements) => queryInterface.sequelize.query(sql, { replacements });
    const now = new Date();
    await queryInterface.bulkInsert('menus', [
      { name: 'Informasi', code: 'INFORMASI_MANAGEMENT', path: null, icon: 'info', order_number: 5, is_active: true, is_public: false, module: 'pmb', created_at: now, updated_at: now },
    ]);
    const [info] = await q("SELECT id FROM menus WHERE code = 'INFORMASI_MANAGEMENT' LIMIT 1");
    await run("UPDATE menus SET name = 'Data Calon Mahasiswa Baru', parent_id = :id, order_number = 1 WHERE code = 'CALON_MAHASISWA_MANAGEMENT'", { id: info.id });
    await run("UPDATE menus SET parent_id = :id, order_number = 2 WHERE code = 'PEMBAYARAN_MANAGEMENT'", { id: info.id });
    // Salin hak akses grup dari Master Data agar grup Informasi tampil lagi.
    await run(
      `INSERT INTO role_menu_permissions (role_id, menu_id, can_create, can_read, can_update, can_delete, created_at, updated_at)
       SELECT role_id, :id, can_create, can_read, can_update, can_delete, NOW(), NOW() FROM role_menu_permissions
       WHERE menu_id = (SELECT id FROM menus WHERE code = 'MASTER_DATA_MANAGEMENT')`,
      { id: info.id }
    );
  },
};
