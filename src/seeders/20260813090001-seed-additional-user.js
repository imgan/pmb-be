'use strict';

const bcrypt = require('bcryptjs');

module.exports = {
  up: async (queryInterface) => {
    const [roles] = await queryInterface.sequelize.query("SELECT id FROM roles WHERE code = 'ADMIN' LIMIT 1");
    const roleId = roles[0].id;
    const hashedPassword = await bcrypt.hash('Password123!', 10);

    await queryInterface.bulkInsert('users', [
      {
        role_id: roleId,
        name: 'Admin PMB',
        username: 'admin',
        email: 'admin@pmb.local',
        password: hashedPassword,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  },
  down: async (queryInterface) => {
    await queryInterface.bulkDelete('users', { username: 'admin' });
  },
};
