'use strict';

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.bulkInsert('menus', [
      {
        name: 'Peserta',
        code: 'PESERTA_MANAGEMENT',
        path: '/peserta',
        icon: 'users',
        order_number: 13,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  },
  down: async (queryInterface) => {
    await queryInterface.bulkDelete('menus', { code: ['PESERTA_MANAGEMENT'] });
  },
};
