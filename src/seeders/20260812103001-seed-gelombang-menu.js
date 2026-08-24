'use strict';

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.bulkInsert('menus', [
      {
        name: 'Gelombang',
        code: 'GELOMBANG_MANAGEMENT',
        path: '/gelombang',
        icon: 'calendar',
        order_number: 12,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  },
  down: async (queryInterface) => {
    await queryInterface.bulkDelete('menus', { code: ['GELOMBANG_MANAGEMENT'] });
  },
};
