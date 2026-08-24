'use strict';

module.exports = {
  up: async (queryInterface) => {
    const [users] = await queryInterface.sequelize.query("SELECT id FROM users WHERE username = 'superadmin' LIMIT 1");
    const actorId = users[0].id;
    const now = new Date();

    await queryInterface.bulkInsert(
      'ukuran_almamater',
      ['S', 'M', 'L', 'XL', 'XXL'].map((ukuran) => ({
        ukuran,
        created_by: actorId,
        updated_by: actorId,
        created_at: now,
        updated_at: now,
      }))
    );
  },
  down: async (queryInterface) => {
    await queryInterface.bulkDelete('ukuran_almamater', { ukuran: ['S', 'M', 'L', 'XL', 'XXL'] });
  },
};
