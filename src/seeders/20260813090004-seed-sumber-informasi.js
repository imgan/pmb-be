'use strict';

module.exports = {
  up: async (queryInterface) => {
    const [users] = await queryInterface.sequelize.query("SELECT id FROM users WHERE username = 'superadmin' LIMIT 1");
    const actorId = users[0].id;
    const now = new Date();

    await queryInterface.bulkInsert(
      'sumber_informasi',
      ['Media Sosial', 'Teman / Saudara', 'Website Resmi', 'Pameran Pendidikan', 'Iklan'].map((namaInformasi) => ({
        nama_informasi: namaInformasi,
        created_by: actorId,
        updated_by: actorId,
        created_at: now,
        updated_at: now,
      }))
    );
  },
  down: async (queryInterface) => {
    await queryInterface.bulkDelete('sumber_informasi', {
      nama_informasi: ['Media Sosial', 'Teman / Saudara', 'Website Resmi', 'Pameran Pendidikan', 'Iklan'],
    });
  },
};
