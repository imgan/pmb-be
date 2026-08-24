'use strict';

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();
    await queryInterface.bulkInsert('menus', [
      {
        name: 'Audit Log',
        code: 'AUDIT_LOG_MANAGEMENT',
        path: '/audit-log',
        icon: 'history',
        order_number: 8,
        is_active: true,
        is_public: false,
        created_at: now,
        updated_at: now,
      },
    ]);
  },
  down: async (queryInterface) => {
    await queryInterface.bulkDelete('menus', { code: ['AUDIT_LOG_MANAGEMENT'] });
  },
};
