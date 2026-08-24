'use strict';

module.exports = {
  up: async (queryInterface) => {
    const [rows] = await queryInterface.sequelize.query(
      "SELECT id FROM menus WHERE code = 'MASTER_DATA_MANAGEMENT' LIMIT 1"
    );
    const groupId = rows[0].id;
    const now = new Date();

    await queryInterface.bulkInsert('menus', [
      {
        parent_id: groupId,
        name: 'Gambar Beranda',
        code: 'HOME_IMAGE_MANAGEMENT',
        path: '/home-images',
        icon: 'image',
        order_number: 14,
        is_active: true,
        is_public: false,
        created_at: now,
        updated_at: now,
      },
    ]);
  },
  down: async (queryInterface) => {
    await queryInterface.bulkDelete('menus', { code: ['HOME_IMAGE_MANAGEMENT'] });
  },
};
