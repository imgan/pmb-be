'use strict';

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();

    await queryInterface.bulkInsert('menus', [
      {
        parent_id: null,
        name: 'Master Monitoring',
        code: 'MASTER_MONITORING_MANAGEMENT',
        path: '/monitoring',
        icon: 'monitoring',
        order_number: 3,
        is_active: true,
        is_public: false,
        module: 'baak',
        created_at: now,
        updated_at: now,
      },
    ]);

    // Geser Jadwal Kuliah & Audit Log satu nomor ke belakang supaya Master Monitoring
    // muncul tepat setelah Mahasiswa.
    await queryInterface.bulkUpdate(
      'menus',
      { order_number: 4, updated_at: now },
      { code: 'JADWAL_KULIAH_MANAGEMENT' }
    );
    await queryInterface.bulkUpdate(
      'menus',
      { order_number: 5, updated_at: now },
      { code: 'BAAK_AUDIT_LOG_MANAGEMENT' }
    );
  },
  down: async (queryInterface) => {
    const now = new Date();
    await queryInterface.bulkUpdate(
      'menus',
      { order_number: 3, updated_at: now },
      { code: 'JADWAL_KULIAH_MANAGEMENT' }
    );
    await queryInterface.bulkUpdate(
      'menus',
      { order_number: 4, updated_at: now },
      { code: 'BAAK_AUDIT_LOG_MANAGEMENT' }
    );
    await queryInterface.bulkDelete('menus', { code: ['MASTER_MONITORING_MANAGEMENT'] });
  },
};
