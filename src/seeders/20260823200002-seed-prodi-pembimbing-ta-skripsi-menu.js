'use strict';

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();

    const [rows] = await queryInterface.sequelize.query(
      "SELECT id FROM menus WHERE code = 'PRODI_BIMBINGAN_MANAGEMENT' LIMIT 1"
    );
    const bimbinganGroupId = rows[0].id;

    await queryInterface.bulkInsert('menus', [
      {
        parent_id: bimbinganGroupId,
        name: 'Pembimbing TA/Skripsi',
        code: 'PRODI_PEMBIMBING_TA_SKRIPSI_MANAGEMENT',
        path: '/bimbingan/pembimbing-ta-skripsi',
        icon: 'menu_book',
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
    await queryInterface.bulkDelete('menus', { code: ['PRODI_PEMBIMBING_TA_SKRIPSI_MANAGEMENT'] });
  },
};
