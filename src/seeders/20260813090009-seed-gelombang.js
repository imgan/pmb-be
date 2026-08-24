'use strict';

module.exports = {
  up: async (queryInterface) => {
    const [users] = await queryInterface.sequelize.query("SELECT id FROM users WHERE username = 'superadmin' LIMIT 1");
    const actorId = users[0].id;
    const now = new Date();

    await queryInterface.bulkInsert('gelombang', [
      {
        nama_gelombang: 'Gelombang 1',
        start_date: '2026-01-01',
        end_date: '2026-03-31',
        deskripsi: 'Pendaftaran gelombang pertama dengan biaya pendaftaran termurah',
        created_by: actorId,
        updated_by: actorId,
        created_at: now,
        updated_at: now,
      },
      {
        nama_gelombang: 'Gelombang 2',
        start_date: '2026-04-01',
        end_date: '2026-06-30',
        deskripsi: 'Pendaftaran gelombang kedua',
        created_by: actorId,
        updated_by: actorId,
        created_at: now,
        updated_at: now,
      },
      {
        nama_gelombang: 'Gelombang 3',
        start_date: '2026-07-01',
        end_date: '2026-09-30',
        deskripsi: 'Pendaftaran gelombang terakhir sebelum tahun ajaran baru',
        created_by: actorId,
        updated_by: actorId,
        created_at: now,
        updated_at: now,
      },
    ]);
  },
  down: async (queryInterface) => {
    await queryInterface.bulkDelete('gelombang', { nama_gelombang: ['Gelombang 1', 'Gelombang 2', 'Gelombang 3'] });
  },
};
