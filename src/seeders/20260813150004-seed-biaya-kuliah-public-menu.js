'use strict';

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.bulkInsert('menus', [
      {
        name: 'Biaya Kuliah',
        code: 'PUBLIC_BIAYA_KULIAH',
        path: '/#biaya-kuliah',
        icon: 'payments',
        order_number: 5,
        is_active: true,
        is_public: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  },
  down: async (queryInterface) => {
    await queryInterface.bulkDelete('menus', { code: ['PUBLIC_BIAYA_KULIAH'] });
  },
};
