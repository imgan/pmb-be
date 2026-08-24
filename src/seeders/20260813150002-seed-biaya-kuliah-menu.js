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
        name: 'Biaya Kuliah',
        code: 'BIAYA_KULIAH_MANAGEMENT',
        path: '/biaya-kuliah',
        icon: 'payments',
        order_number: 15,
        is_active: true,
        is_public: false,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  },
  down: async (queryInterface) => {
    await queryInterface.bulkDelete('menus', { code: ['BIAYA_KULIAH_MANAGEMENT'] });
  },
};
