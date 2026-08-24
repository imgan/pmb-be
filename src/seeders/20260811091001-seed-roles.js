'use strict';

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.bulkInsert('roles', [
      {
        name: 'Super Administrator',
        code: 'SUPERADMIN',
        description: 'Full access to all master data and settings',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        name: 'Administrator',
        code: 'ADMIN',
        description: 'Standard administrative access',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  },
  down: async (queryInterface) => {
    await queryInterface.bulkDelete('roles', { code: ['SUPERADMIN', 'ADMIN'] });
  },
};
