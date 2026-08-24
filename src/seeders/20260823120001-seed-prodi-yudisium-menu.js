'use strict';

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();
    await queryInterface.bulkInsert('menus', [
      {
        parent_id: null,
        name: 'Yudisium',
        code: 'PRODI_YUDISIUM_MANAGEMENT',
        path: '/yudisium',
        icon: 'workspace_premium',
        order_number: 3,
        is_active: true,
        is_public: false,
        module: 'prodi',
        created_at: now,
        updated_at: now,
      },
    ]);
  },
  down: async (queryInterface) => {
    await queryInterface.bulkDelete('menus', { code: ['PRODI_YUDISIUM_MANAGEMENT'] });
  },
};
