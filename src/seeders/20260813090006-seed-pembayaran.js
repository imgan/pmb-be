'use strict';

module.exports = {
  up: async (queryInterface) => {
    const [users] = await queryInterface.sequelize.query("SELECT id FROM users WHERE username = 'superadmin' LIMIT 1");
    const actorId = users[0].id;
    const now = new Date();

    await queryInterface.bulkInsert('pembayaran', [
      { nama_pembayaran: 'Biaya Pendaftaran', is_beasiswa: false, created_by: actorId, updated_by: actorId, created_at: now, updated_at: now },
      { nama_pembayaran: 'Biaya Almamater', is_beasiswa: false, created_by: actorId, updated_by: actorId, created_at: now, updated_at: now },
      { nama_pembayaran: 'Dana Pengembangan', is_beasiswa: false, created_by: actorId, updated_by: actorId, created_at: now, updated_at: now },
      { nama_pembayaran: 'Beasiswa Prestasi', is_beasiswa: true, created_by: actorId, updated_by: actorId, created_at: now, updated_at: now },
      { nama_pembayaran: 'Beasiswa Yatim Piatu', is_beasiswa: true, created_by: actorId, updated_by: actorId, created_at: now, updated_at: now },
    ]);
  },
  down: async (queryInterface) => {
    await queryInterface.bulkDelete('pembayaran', {
      nama_pembayaran: ['Biaya Pendaftaran', 'Biaya Almamater', 'Dana Pengembangan', 'Beasiswa Prestasi', 'Beasiswa Yatim Piatu'],
    });
  },
};
