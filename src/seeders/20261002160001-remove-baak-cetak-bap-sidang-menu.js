'use strict';

// Hapus menu "Cetak BAP Sidang TA" dari grup Laporan di modul BAAK; menu sesudahnya digeser naik satu urutan.
const CODE = 'LAPORAN_CETAK_BAP_SIDANG_MANAGEMENT';

const q = (queryInterface, sql, replacements) => queryInterface.sequelize.query(sql, { replacements }).then(([rows]) => rows);

module.exports = {
  up: async (queryInterface) => {
    const [menu] = await q(queryInterface, 'SELECT id, parent_id, order_number FROM menus WHERE code = :code LIMIT 1', { code: CODE });
    if (!menu) return;
    await queryInterface.bulkDelete('role_menu_permissions', { menu_id: menu.id });
    await queryInterface.bulkDelete('menus', { id: menu.id });
    await queryInterface.sequelize.query(
      'UPDATE menus SET order_number = order_number - 1, updated_at = NOW() WHERE parent_id = :parentId AND order_number > :order',
      { replacements: { parentId: menu.parent_id, order: menu.order_number } }
    );
  },
  // Fitur (route, controller, halaman) ikut dihapus, jadi menu tidak dibuat ulang.
  down: async () => {},
};
