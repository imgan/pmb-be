'use strict';

/**
 * Referensi Judul tidak lagi diinput BAAK: portal dosen (Lain-Lain → Referensi Judul) kini membaca judul
 * TA yang diajukan mahasiswa (Pengajuan TA disetujui prodi) & judul Yudisium. Menu BAAK beserta hak
 * aksesnya dihapus dan tabel referensi_judul dibuang — isinya hanya data dummy (NIM "DMY…").
 * Pengaman: dibatalkan bila tabel berisi baris non-dummy.
 */
const CODE = 'BAAK_REFERENSI_JUDUL_MANAGEMENT';

module.exports = {
  up: async (queryInterface) => {
    const q = (sql, replacements) => queryInterface.sequelize.query(sql, { replacements, type: queryInterface.sequelize.QueryTypes.SELECT });
    const tables = await queryInterface.showAllTables();
    if (tables.includes('referensi_judul')) {
      const [{ n }] = await q("SELECT COUNT(*) AS n FROM referensi_judul WHERE nim NOT LIKE 'DMY%'");
      if (Number(n) > 0) throw new Error(`referensi_judul berisi ${n} baris non-dummy; pindahkan manual dulu`);
    }

    const [menu] = await q('SELECT id, order_number FROM menus WHERE code = :code LIMIT 1', { code: CODE });
    if (menu) {
      await queryInterface.bulkDelete('role_menu_permissions', { menu_id: menu.id });
      await queryInterface.bulkDelete('menus', { id: menu.id });
      await queryInterface.sequelize.query(
        "UPDATE menus SET order_number = order_number - 1, updated_at = NOW() WHERE module = 'baak' AND parent_id IS NULL AND order_number > :order",
        { replacements: { order: menu.order_number } }
      );
    }
    if (tables.includes('referensi_judul')) await queryInterface.dropTable('referensi_judul');
  },

  down: async () => {
    // Tidak dikembalikan: menu & data dummy referensi judul BAAK sudah tidak dipakai.
  },
};
