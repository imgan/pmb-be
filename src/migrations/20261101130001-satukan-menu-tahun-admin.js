'use strict';

/**
 * Modul Admin: semua pengaturan tahun disatukan dalam satu menu "Tahun" (halaman bertab).
 * Sub-menu Master › Tahun hanya dinonaktifkan: kode menunya tetap dipakai sebagai izin tiap tab.
 */
const SUB_MENU = [
  'ADMIN_MASTER_TAHUN_AKADEMIK_MANAGEMENT',
  'ADMIN_MASTER_TAHUN_KEUANGAN_MANAGEMENT',
  'ADMIN_MASTER_TAHUN_PMB_MANAGEMENT',
  'ADMIN_MASTER_TAHUN_FRS_MANAGEMENT',
  'ADMIN_MASTER_TAHUN_TA_SKRIPSI_MANAGEMENT',
  'ADMIN_MASTER_TAHUN_SP_MANAGEMENT',
];

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query("UPDATE menus SET name = 'Tahun', path = '/tahun', icon = 'calendar_month', updated_at = NOW() WHERE code = 'TAHUN_AJARAN_MANAGEMENT'");
    await queryInterface.sequelize.query('UPDATE menus SET is_active = 0, updated_at = NOW() WHERE code IN (:kode)', { replacements: { kode: SUB_MENU } });
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query("UPDATE menus SET name = 'Tahun Ajaran', path = '/tahun-ajaran', icon = 'event_note', updated_at = NOW() WHERE code = 'TAHUN_AJARAN_MANAGEMENT'");
    await queryInterface.sequelize.query('UPDATE menus SET is_active = 1, updated_at = NOW() WHERE code IN (:kode)', { replacements: { kode: SUB_MENU } });
  },
};
