'use strict';

module.exports = {
  up: async (queryInterface) => {
    const [users] = await queryInterface.sequelize.query("SELECT id FROM users WHERE username = 'superadmin' LIMIT 1");
    const actorId = users[0].id;
    const now = new Date();

    await queryInterface.bulkInsert('dokumen_kelengkapan', [
      { nama_kelengkapan: 'Ijazah Terakhir', is_wajib: true, is_beasiswa: false, file: null, created_by: actorId, updated_by: actorId, created_at: now, updated_at: now },
      { nama_kelengkapan: 'Rapor Semester Akhir', is_wajib: true, is_beasiswa: false, file: null, created_by: actorId, updated_by: actorId, created_at: now, updated_at: now },
      { nama_kelengkapan: 'Surat Keterangan Sehat', is_wajib: false, is_beasiswa: false, file: null, created_by: actorId, updated_by: actorId, created_at: now, updated_at: now },
      { nama_kelengkapan: 'Surat Rekomendasi Beasiswa', is_wajib: false, is_beasiswa: true, file: null, created_by: actorId, updated_by: actorId, created_at: now, updated_at: now },
      { nama_kelengkapan: 'Surat Keterangan Tidak Mampu', is_wajib: false, is_beasiswa: true, file: null, created_by: actorId, updated_by: actorId, created_at: now, updated_at: now },
    ]);
  },
  down: async (queryInterface) => {
    await queryInterface.bulkDelete('dokumen_kelengkapan', {
      nama_kelengkapan: [
        'Ijazah Terakhir',
        'Rapor Semester Akhir',
        'Surat Keterangan Sehat',
        'Surat Rekomendasi Beasiswa',
        'Surat Keterangan Tidak Mampu',
      ],
    });
  },
};
