'use strict';

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();
    await queryInterface.bulkInsert('menus', [
      {
        name: 'Reporting',
        code: 'REPORTING_MANAGEMENT',
        path: '/reporting',
        icon: 'bar_chart',
        order_number: 7,
        is_active: true,
        is_public: false,
        created_at: now,
        updated_at: now,
      },
    ]);
  },
  down: async (queryInterface) => {
    await queryInterface.bulkDelete('menus', { code: ['REPORTING_MANAGEMENT'] });
  },
};
