'use strict';

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();

    await queryInterface.bulkInsert('menus', [
      {
        parent_id: null,
        name: 'Monitoring Nilai',
        code: 'NILAI_MONITORING_MANAGEMENT',
        path: '/monitoring-nilai',
        icon: 'grading',
        order_number: 7,
        is_active: true,
        is_public: false,
        module: 'baak',
        created_at: now,
        updated_at: now,
      },
    ]);
  },
  down: async (queryInterface) => {
    await queryInterface.bulkDelete('menus', { code: ['NILAI_MONITORING_MANAGEMENT'] });
  },
};
