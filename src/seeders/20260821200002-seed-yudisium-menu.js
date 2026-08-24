'use strict';

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();

    await queryInterface.bulkInsert('menus', [
      {
        parent_id: null,
        name: 'Laporan Yudisium',
        code: 'YUDISIUM_MANAGEMENT',
        path: '/yudisium',
        icon: 'workspace_premium',
        order_number: 8,
        is_active: true,
        is_public: false,
        module: 'baak',
        created_at: now,
        updated_at: now,
      },
    ]);

    // Kembalikan urutan Audit Log di atas Monitoring Nilai (sempat tertukar oleh
    // perubahan lain), sesuai permintaan sebelumnya: Monitoring Nilai di bawah Audit Log.
    await queryInterface.bulkUpdate(
      'menus',
      { order_number: 6, updated_at: now },
      { code: 'BAAK_AUDIT_LOG_MANAGEMENT' }
    );
    await queryInterface.bulkUpdate(
      'menus',
      { order_number: 7, updated_at: now },
      { code: 'NILAI_MONITORING_MANAGEMENT' }
    );
  },
  down: async (queryInterface) => {
    const now = new Date();
    await queryInterface.bulkUpdate(
      'menus',
      { order_number: 6, updated_at: now },
      { code: 'NILAI_MONITORING_MANAGEMENT' }
    );
    await queryInterface.bulkUpdate(
      'menus',
      { order_number: 7, updated_at: now },
      { code: 'BAAK_AUDIT_LOG_MANAGEMENT' }
    );
    await queryInterface.bulkDelete('menus', { code: ['YUDISIUM_MANAGEMENT'] });
  },
};
