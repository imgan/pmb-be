'use strict';

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();

    await queryInterface.bulkInsert('menus', [
      {
        parent_id: null,
        name: 'Audit Log',
        code: 'BAAK_AUDIT_LOG_MANAGEMENT',
        path: '/audit-log',
        icon: 'history',
        order_number: 4,
        is_active: true,
        is_public: false,
        module: 'baak',
        created_at: now,
        updated_at: now,
      },
    ]);
  },
  down: async (queryInterface) => {
    await queryInterface.bulkDelete('menus', { code: ['BAAK_AUDIT_LOG_MANAGEMENT'] });
  },
};
