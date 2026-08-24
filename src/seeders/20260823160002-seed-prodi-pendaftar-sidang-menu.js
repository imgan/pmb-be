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
        name: 'Pendaftar Sidang',
        code: 'PRODI_PENDAFTAR_SIDANG_MANAGEMENT',
        path: '/sidang/pendaftar-sidang',
        icon: 'how_to_reg',
        order_number: 2,
        is_active: true,
        is_public: false,
        module: 'prodi',
        created_at: now,
        updated_at: now,
      },
    ]);
  },
  down: async (queryInterface) => {
    await queryInterface.bulkDelete('menus', { code: ['PRODI_PENDAFTAR_SIDANG_MANAGEMENT'] });
  },
};
