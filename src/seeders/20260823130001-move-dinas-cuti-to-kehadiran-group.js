'use strict';

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();

    await queryInterface.bulkInsert('menus', [
      {
        parent_id: null,
        name: 'Kehadiran',
        code: 'SDI_KEHADIRAN_MANAGEMENT',
        path: null,
        icon: 'event_available',
        order_number: 3,
        is_active: true,
        is_public: false,
        module: 'sdi',
        created_at: now,
        updated_at: now,
      },
    ]);

    const [rows] = await queryInterface.sequelize.query(
      "SELECT id FROM menus WHERE code = 'SDI_KEHADIRAN_MANAGEMENT' LIMIT 1"
    );
    const kehadiranGroupId = rows[0].id;

    await queryInterface.bulkUpdate(
      'menus',
      { parent_id: kehadiranGroupId, order_number: 1, updated_at: now },
      { code: 'DINAS_CUTI_LUPA_FINGER_MANAGEMENT' }
    );
  },
  down: async (queryInterface) => {
    const now = new Date();
    const [rows] = await queryInterface.sequelize.query("SELECT id FROM menus WHERE code = 'SDI_MANAGEMENT' LIMIT 1");
    const masterGroupId = rows[0].id;

    await queryInterface.bulkUpdate(
      'menus',
      { parent_id: masterGroupId, order_number: 5, updated_at: now },
      { code: 'DINAS_CUTI_LUPA_FINGER_MANAGEMENT' }
    );

    await queryInterface.bulkDelete('menus', { code: ['SDI_KEHADIRAN_MANAGEMENT'] });
  },
};
