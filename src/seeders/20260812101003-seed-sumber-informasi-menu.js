'use strict';

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.bulkInsert('menus', [
      {
        name: 'Sumber Informasi',
        code: 'SUMBER_INFORMASI_MANAGEMENT',
        path: '/sumber-informasi',
        icon: 'info',
        order_number: 7,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  },
  down: async (queryInterface) => {
    await queryInterface.bulkDelete('menus', { code: ['SUMBER_INFORMASI_MANAGEMENT'] });
  },
};
