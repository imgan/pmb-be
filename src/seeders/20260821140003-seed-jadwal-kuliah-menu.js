'use strict';

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.bulkInsert('menus', [
      {
        parent_id: null,
        name: 'Jadwal Kuliah',
        code: 'JADWAL_KULIAH_MANAGEMENT',
        path: '/jadwal-kuliah',
        icon: 'event_note',
        order_number: 3,
        is_active: true,
        is_public: false,
        module: 'baak',
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  },
  down: async (queryInterface) => {
    await queryInterface.bulkDelete('menus', { code: ['JADWAL_KULIAH_MANAGEMENT'] });
  },
};
