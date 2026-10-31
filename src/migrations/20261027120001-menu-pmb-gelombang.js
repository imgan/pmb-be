'use strict';

/**
 * Sidebar PMB: "Gelombang" keluar dari grup Master Data menjadi menu utama tepat setelah "Peserta".
 * Kode menu tetap, jadi hak akses role tidak berubah.
 */
const URUTAN = [
  'DASHBOARD',
  'CALON_MAHASISWA_MANAGEMENT',
  'GELOMBANG_MANAGEMENT',
  'PMB_MASTER_GRAFIK_GROUP_MANAGEMENT',
  'MENU_MANAGEMENT',
  'MASTER_DATA_MANAGEMENT',
  'REPORTING_MANAGEMENT',
  'AUDIT_LOG_MANAGEMENT',
  'README_MANAGEMENT',
];

const urutkan = async (queryInterface, urutan) => {
  for (const [i, code] of urutan.entries()) {
    await queryInterface.sequelize.query(
      "UPDATE menus SET order_number = :order, updated_at = NOW() WHERE module = 'pmb' AND parent_id IS NULL AND code = :code",
      { replacements: { order: i + 1, code } }
    );
  }
};

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query("UPDATE menus SET parent_id = NULL, updated_at = NOW() WHERE code = 'GELOMBANG_MANAGEMENT'");
    await urutkan(queryInterface, URUTAN);
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query(
      "UPDATE menus SET parent_id = (SELECT id FROM (SELECT id FROM menus WHERE code = 'MASTER_DATA_MANAGEMENT') m), order_number = 12, updated_at = NOW() WHERE code = 'GELOMBANG_MANAGEMENT'"
    );
    await urutkan(queryInterface, URUTAN.filter((c) => c !== 'GELOMBANG_MANAGEMENT'));
  },
};
