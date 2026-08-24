'use strict';

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();

    await queryInterface.bulkInsert('menus', [
      {
        parent_id: null,
        name: 'ReadMe',
        code: 'README_MANAGEMENT',
        path: '/readme',
        icon: 'menu_book',
        order_number: 9,
        is_active: true,
        is_public: false,
        module: 'pmb',
        created_at: now,
        updated_at: now,
      },
    ]);
  },
  down: async (queryInterface) => {
    await queryInterface.bulkDelete('menus', { code: ['README_MANAGEMENT'] });
  },
};
