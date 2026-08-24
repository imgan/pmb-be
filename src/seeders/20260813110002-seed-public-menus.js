'use strict';

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.bulkInsert('menus', [
      {
        name: 'Beranda',
        code: 'PUBLIC_HOME',
        path: '/',
        icon: 'home',
        order_number: 1,
        is_active: true,
        is_public: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        name: 'Program Studi',
        code: 'PUBLIC_PROGRAM_STUDI',
        path: '/#program',
        icon: 'school',
        order_number: 2,
        is_active: true,
        is_public: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        name: 'Beasiswa',
        code: 'PUBLIC_BEASISWA',
        path: '/#beasiswa',
        icon: 'military_tech',
        order_number: 3,
        is_active: true,
        is_public: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        name: 'Fasilitas',
        code: 'PUBLIC_FASILITAS',
        path: '/#fasilitas',
        icon: 'apartment',
        order_number: 4,
        is_active: true,
        is_public: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  },
  down: async (queryInterface) => {
    await queryInterface.bulkDelete('menus', {
      code: ['PUBLIC_HOME', 'PUBLIC_PROGRAM_STUDI', 'PUBLIC_BEASISWA', 'PUBLIC_FASILITAS'],
    });
  },
};
