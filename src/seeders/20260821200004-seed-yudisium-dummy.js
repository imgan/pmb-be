'use strict';

module.exports = {
  up: async (queryInterface) => {
    const [mahasiswaList] = await queryInterface.sequelize.query(
      'SELECT id FROM mahasiswa ORDER BY id ASC'
    );
    if (mahasiswaList.length === 0) return;

    const [dosenList] = await queryInterface.sequelize.query('SELECT id FROM dosen ORDER BY id ASC LIMIT 4');
    const [users] = await queryInterface.sequelize.query("SELECT id FROM users WHERE username = 'superadmin' LIMIT 1");
    const actorId = users.length ? users[0].id : null;
    const now = new Date();

    const sample = [
      {
        noSk: '072/SK/REKTOR-UBS/X/2025',
        tanggalSk: '2025-10-01',
        tanggalYudisium: '2025-09-30',
        pin: '0411195720251000021',
        judul: 'Implementasi Deployment Aplikasi Menggunakan Docker Compose pada Platform Linux Berbasis Container',
      },
      {
        noSk: '018.A/SK/REKTOR-UBS/II/2024',
        tanggalSk: '2024-02-28',
        tanggalYudisium: '2024-02-27',
        pin: '0411195720241000011',
        judul: 'Sistem Informasi E-CRM dalam Pengelolaan Jasa Layanan Laundry Berbasis Web dengan Metode Waterfall',
      },
    ];

    const rows = mahasiswaList.map((m, index) => {
      const s = sample[index % sample.length];
      const filled = index % 3 !== 2;
      return {
        mahasiswa_id: m.id,
        no_sk: filled ? s.noSk : null,
        tanggal_sk: filled ? s.tanggalSk : null,
        tanggal_yudisium: filled ? s.tanggalYudisium : null,
        pin: filled ? s.pin : null,
        judul: s.judul,
        pembimbing1_id: dosenList[index % dosenList.length]?.id ?? null,
        pembimbing2_id: dosenList[(index + 1) % dosenList.length]?.id ?? null,
        created_by: actorId,
        updated_by: actorId,
        created_at: now,
        updated_at: now,
      };
    });

    await queryInterface.bulkInsert('yudisium', rows);
  },
  down: async (queryInterface) => {
    await queryInterface.bulkDelete('yudisium', {});
  },
};
