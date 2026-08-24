'use strict';

module.exports = {
  up: async (queryInterface) => {
    const [users] = await queryInterface.sequelize.query("SELECT id FROM users WHERE username = 'superadmin' LIMIT 1");
    const actorId = users[0].id;
    const now = new Date();

    await queryInterface.bulkInsert('dokumen_pendaftaran', [
      { nama_pendaftaran: 'Kartu Keluarga', is_wajib: true, created_by: actorId, updated_by: actorId, created_at: now, updated_at: now },
      { nama_pendaftaran: 'Akte Kelahiran', is_wajib: true, created_by: actorId, updated_by: actorId, created_at: now, updated_at: now },
      { nama_pendaftaran: 'Ijazah / Surat Keterangan Lulus', is_wajib: true, created_by: actorId, updated_by: actorId, created_at: now, updated_at: now },
      { nama_pendaftaran: 'Pas Foto 3x4', is_wajib: true, created_by: actorId, updated_by: actorId, created_at: now, updated_at: now },
      { nama_pendaftaran: 'KTP Orang Tua / Wali', is_wajib: false, created_by: actorId, updated_by: actorId, created_at: now, updated_at: now },
    ]);
  },
  down: async (queryInterface) => {
    await queryInterface.bulkDelete('dokumen_pendaftaran', {
      nama_pendaftaran: [
        'Kartu Keluarga',
        'Akte Kelahiran',
        'Ijazah / Surat Keterangan Lulus',
        'Pas Foto 3x4',
        'KTP Orang Tua / Wali',
      ],
    });
  },
};
