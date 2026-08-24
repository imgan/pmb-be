'use strict';

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();

    await queryInterface.bulkInsert('menus', [
      {
        parent_id: null,
        name: 'ReadMe',
        code: 'PRODI_README_MANAGEMENT',
        path: '/readme',
        icon: 'menu_book',
        order_number: 10,
        is_active: true,
        is_public: false,
        module: 'prodi',
        created_at: now,
        updated_at: now,
      },
    ]);
  },
  down: async (queryInterface) => {
    await queryInterface.bulkDelete('menus', { code: ['PRODI_README_MANAGEMENT'] });
  },
};
