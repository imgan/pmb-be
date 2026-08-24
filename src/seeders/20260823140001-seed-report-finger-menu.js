'use strict';

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();
    const [rows] = await queryInterface.sequelize.query(
      "SELECT id FROM menus WHERE code = 'SDI_KEHADIRAN_MANAGEMENT' LIMIT 1"
    );
    const parentId = rows[0].id;

    await queryInterface.bulkInsert('menus', [
      {
        parent_id: parentId,
        name: 'Report Finger',
        code: 'REPORT_FINGER_MANAGEMENT',
        path: '/report-finger',
        icon: 'summarize',
        order_number: 2,
        is_active: true,
        is_public: false,
        module: 'sdi',
        created_at: now,
        updated_at: now,
      },
    ]);
  },
  down: async (queryInterface) => {
    await queryInterface.bulkDelete('menus', { code: ['REPORT_FINGER_MANAGEMENT'] });
  },
};
