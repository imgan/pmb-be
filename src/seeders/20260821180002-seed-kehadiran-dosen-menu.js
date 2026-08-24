'use strict';

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();

    await queryInterface.bulkInsert('menus', [
      {
        parent_id: null,
        name: 'Monitoring Kehadiran Dosen',
        code: 'KEHADIRAN_DOSEN_MANAGEMENT',
        path: '/kehadiran-dosen',
        icon: 'fact_check',
        order_number: 4,
        is_active: true,
        is_public: false,
        module: 'baak',
        created_at: now,
        updated_at: now,
      },
    ]);

    await queryInterface.bulkUpdate(
      'menus',
      { order_number: 5, updated_at: now },
      { code: 'JADWAL_KULIAH_MANAGEMENT' }
    );
    await queryInterface.bulkUpdate(
      'menus',
      { order_number: 6, updated_at: now },
      { code: 'BAAK_AUDIT_LOG_MANAGEMENT' }
    );
  },
  down: async (queryInterface) => {
    const now = new Date();
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
    await queryInterface.bulkDelete('menus', { code: ['KEHADIRAN_DOSEN_MANAGEMENT'] });
  },
};
