'use strict';

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();

    await queryInterface.bulkInsert('menus', [
      {
        parent_id: null,
        name: 'ReadMe',
        code: 'SDI_README_MANAGEMENT',
        path: '/readme',
        icon: 'menu_book',
        order_number: 4,
        is_active: true,
        is_public: false,
        module: 'sdi',
        created_at: now,
        updated_at: now,
      },
    ]);
  },
  down: async (queryInterface) => {
    await queryInterface.bulkDelete('menus', { code: ['SDI_README_MANAGEMENT'] });
  },
};
