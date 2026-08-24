'use strict';

module.exports = {
  up: async (queryInterface) => {
    const [users] = await queryInterface.sequelize.query("SELECT id FROM users WHERE username = 'superadmin' LIMIT 1");
    const actorId = users[0].id;
    const now = new Date();

    await queryInterface.bulkInsert('kampus', [
      {
        nama_kampus: 'Politeknik Bhakti Kartini',
        alamat: 'Jl. Caringin Jembatan 14, RT.001/RW.005, Bojong Rawalumbu, Kec. Rawalumbu, Kota Bekasi, Jawa Barat 17116',
        telepon: '0813-1645-5664',
        kode_pos: '17116',
        email: 'info@poltekbhaktikartini.ac.id',
        whatsapp_number: '6281316455664',
        facebook_url: null,
        instagram_url: null,
        youtube_url: null,
        created_by: actorId,
        updated_by: actorId,
        created_at: now,
        updated_at: now,
      },
    ]);
  },
  down: async (queryInterface) => {
    await queryInterface.bulkDelete('kampus', { nama_kampus: 'Politeknik Bhakti Kartini' });
  },
};
