'use strict';

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();

    await queryInterface.bulkInsert('menus', [
      {
        parent_id: null,
        name: 'Tahun Ajaran',
        code: 'TAHUN_AJARAN_MANAGEMENT',
        path: '/tahun-ajaran',
        icon: 'event_note',
        order_number: 5,
        is_active: true,
        is_public: false,
        module: 'baak',
        created_at: now,
        updated_at: now,
      },
    ]);

    // Geser menu setelahnya supaya Tahun Ajaran muncul tepat sebelum Jadwal Kuliah
    // (dipakai sebagai referensi saat generate mahasiswa & membuat jadwal kuliah).
    await queryInterface.bulkUpdate('menus', { order_number: 6, updated_at: now }, { code: 'JADWAL_KULIAH_MANAGEMENT' });
    await queryInterface.bulkUpdate('menus', { order_number: 7, updated_at: now }, { code: 'BAAK_AUDIT_LOG_MANAGEMENT' });
    await queryInterface.bulkUpdate('menus', { order_number: 8, updated_at: now }, { code: 'NILAI_MONITORING_MANAGEMENT' });
    await queryInterface.bulkUpdate('menus', { order_number: 9, updated_at: now }, { code: 'YUDISIUM_MANAGEMENT' });
    await queryInterface.bulkUpdate('menus', { order_number: 10, updated_at: now }, { code: 'BAAK_LAPORAN_MANAGEMENT' });
    await queryInterface.bulkUpdate('menus', { order_number: 11, updated_at: now }, { code: 'BAAK_README_MANAGEMENT' });
  },
  down: async (queryInterface) => {
    const now = new Date();
    await queryInterface.bulkUpdate('menus', { order_number: 5, updated_at: now }, { code: 'JADWAL_KULIAH_MANAGEMENT' });
    await queryInterface.bulkUpdate('menus', { order_number: 6, updated_at: now }, { code: 'BAAK_AUDIT_LOG_MANAGEMENT' });
    await queryInterface.bulkUpdate('menus', { order_number: 7, updated_at: now }, { code: 'NILAI_MONITORING_MANAGEMENT' });
    await queryInterface.bulkUpdate('menus', { order_number: 8, updated_at: now }, { code: 'YUDISIUM_MANAGEMENT' });
    await queryInterface.bulkUpdate('menus', { order_number: 9, updated_at: now }, { code: 'BAAK_LAPORAN_MANAGEMENT' });
    await queryInterface.bulkUpdate('menus', { order_number: 10, updated_at: now }, { code: 'BAAK_README_MANAGEMENT' });
    await queryInterface.bulkDelete('menus', { code: ['TAHUN_AJARAN_MANAGEMENT'] });
  },
};
