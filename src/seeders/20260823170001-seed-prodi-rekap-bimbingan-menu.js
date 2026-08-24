'use strict';

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();

    const [rows] = await queryInterface.sequelize.query(
      "SELECT id FROM menus WHERE code = 'PRODI_SIDANG_MANAGEMENT' LIMIT 1"
    );
    const sidangGroupId = rows[0].id;

    await queryInterface.bulkInsert('menus', [
      {
        parent_id: sidangGroupId,
        name: 'Rekap Bimbingan',
        code: 'PRODI_REKAP_BIMBINGAN_MANAGEMENT',
        path: '/sidang/rekap-bimbingan',
        icon: 'summarize',
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
    await queryInterface.bulkDelete('menus', { code: ['PRODI_REKAP_BIMBINGAN_MANAGEMENT'] });
  },
};
