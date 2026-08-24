'use strict';

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.bulkUpdate(
      'menus',
      { name: 'Template Kehadiran', updated_at: new Date() },
      { code: 'LAPORAN_CETAK_KEHADIRAN_MENGAJAR_MANAGEMENT' }
    );
  },
  down: async (queryInterface) => {
    await queryInterface.bulkUpdate(
      'menus',
      { name: 'Cetak Kehadiran Mengajar', updated_at: new Date() },
      { code: 'LAPORAN_CETAK_KEHADIRAN_MENGAJAR_MANAGEMENT' }
    );
  },
};
