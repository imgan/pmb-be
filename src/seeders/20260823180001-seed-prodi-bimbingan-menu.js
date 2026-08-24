'use strict';

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();

    await queryInterface.bulkInsert('menus', [
      {
        parent_id: null,
        name: 'Bimbingan',
        code: 'PRODI_BIMBINGAN_MANAGEMENT',
        path: null,
        icon: 'diversity_3',
        order_number: 5,
        is_active: true,
        is_public: false,
        module: 'prodi',
        created_at: now,
        updated_at: now,
      },
    ]);

    const [rows] = await queryInterface.sequelize.query(
      "SELECT id FROM menus WHERE code = 'PRODI_BIMBINGAN_MANAGEMENT' LIMIT 1"
    );
    const bimbinganGroupId = rows[0].id;

    await queryInterface.bulkInsert('menus', [
      {
        parent_id: bimbinganGroupId,
        name: 'Pembimbing Magang',
        code: 'PRODI_PEMBIMBING_MAGANG_MANAGEMENT',
        path: '/bimbingan/pembimbing-magang',
        icon: 'badge',
        order_number: 1,
        is_active: true,
        is_public: false,
        module: 'prodi',
        created_at: now,
        updated_at: now,
      },
    ]);
  },
  down: async (queryInterface) => {
    await queryInterface.bulkDelete('menus', { code: ['PRODI_PEMBIMBING_MAGANG_MANAGEMENT'] });
    await queryInterface.bulkDelete('menus', { code: ['PRODI_BIMBINGAN_MANAGEMENT'] });
  },
};
