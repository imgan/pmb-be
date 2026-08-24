'use strict';

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();

    await queryInterface.bulkInsert('menus', [
      {
        parent_id: null,
        name: 'Sidang',
        code: 'PRODI_SIDANG_MANAGEMENT',
        path: null,
        icon: 'gavel',
        order_number: 4,
        is_active: true,
        is_public: false,
        module: 'prodi',
        created_at: now,
        updated_at: now,
      },
    ]);

    const [rows] = await queryInterface.sequelize.query(
      "SELECT id FROM menus WHERE code = 'PRODI_SIDANG_MANAGEMENT' LIMIT 1"
    );
    const sidangGroupId = rows[0].id;

    await queryInterface.bulkInsert('menus', [
      {
        parent_id: sidangGroupId,
        name: 'Jadwal Sidang',
        code: 'PRODI_JADWAL_SIDANG_MANAGEMENT',
        path: '/sidang/jadwal-sidang',
        icon: 'event',
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
    await queryInterface.bulkDelete('menus', { code: ['PRODI_JADWAL_SIDANG_MANAGEMENT'] });
    await queryInterface.bulkDelete('menus', { code: ['PRODI_SIDANG_MANAGEMENT'] });
  },
};
