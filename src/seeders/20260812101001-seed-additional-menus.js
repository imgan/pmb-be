'use strict';

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.bulkInsert('menus', [
      {
        name: 'Golongan Kelas',
        code: 'GOLONGAN_KELAS_MANAGEMENT',
        path: '/golongan-kelas',
        icon: 'layers',
        order_number: 5,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        name: 'Jurusan',
        code: 'JURUSAN_MANAGEMENT',
        path: '/jurusan',
        icon: 'book',
        order_number: 6,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  },
  down: async (queryInterface) => {
    await queryInterface.bulkDelete('menus', {
      code: ['GOLONGAN_KELAS_MANAGEMENT', 'JURUSAN_MANAGEMENT'],
    });
  },
};
