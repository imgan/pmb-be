'use strict';

module.exports = {
  up: async (queryInterface) => {
    const [rows] = await queryInterface.sequelize.query(
      "SELECT id FROM menus WHERE code = 'MASTER_DATA_MANAGEMENT' LIMIT 1"
    );
    const groupId = rows[0].id;

    await queryInterface.bulkInsert('menus', [
      {
        parent_id: groupId,
        name: 'Profil Kampus',
        code: 'KAMPUS_MANAGEMENT',
        path: '/kampus',
        icon: 'apartment',
        order_number: 13,
        is_active: true,
        is_public: false,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  },
  down: async (queryInterface) => {
    await queryInterface.bulkDelete('menus', { code: ['KAMPUS_MANAGEMENT'] });
  },
};
