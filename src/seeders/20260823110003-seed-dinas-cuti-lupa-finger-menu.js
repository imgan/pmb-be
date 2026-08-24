'use strict';

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();
    const [rows] = await queryInterface.sequelize.query("SELECT id FROM menus WHERE code = 'SDI_MANAGEMENT' LIMIT 1");
    const parentId = rows[0].id;

    await queryInterface.bulkInsert('menus', [
      {
        parent_id: parentId,
        name: 'Tugas Dinas/Cuti/Lupa Finger',
        code: 'DINAS_CUTI_LUPA_FINGER_MANAGEMENT',
        path: '/dinas-cuti-lupa-finger',
        icon: 'event_busy',
        order_number: 5,
        is_active: true,
        is_public: false,
        module: 'sdi',
        created_at: now,
        updated_at: now,
      },
    ]);
  },
  down: async (queryInterface) => {
    await queryInterface.bulkDelete('menus', { code: ['DINAS_CUTI_LUPA_FINGER_MANAGEMENT'] });
  },
};
