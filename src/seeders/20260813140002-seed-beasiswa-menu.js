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
        name: 'Beasiswa',
        code: 'BEASISWA_MANAGEMENT',
        path: '/beasiswa',
        icon: 'military_tech',
        order_number: 14,
        is_active: true,
        is_public: false,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  },
  down: async (queryInterface) => {
    await queryInterface.bulkDelete('menus', { code: ['BEASISWA_MANAGEMENT'] });
  },
};
