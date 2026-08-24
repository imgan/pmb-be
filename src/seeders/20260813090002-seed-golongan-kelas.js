'use strict';

module.exports = {
  up: async (queryInterface) => {
    const [users] = await queryInterface.sequelize.query("SELECT id FROM users WHERE username = 'superadmin' LIMIT 1");
    const actorId = users[0].id;
    const now = new Date();

    await queryInterface.bulkInsert('golongan_kelas', [
      { nama_kelas: 'Reguler', is_delete: false, created_by: actorId, updated_by: actorId, created_at: now, updated_at: now },
      { nama_kelas: 'Karyawan', is_delete: false, created_by: actorId, updated_by: actorId, created_at: now, updated_at: now },
      { nama_kelas: 'Kelas Malam', is_delete: false, created_by: actorId, updated_by: actorId, created_at: now, updated_at: now },
    ]);
  },
  down: async (queryInterface) => {
    await queryInterface.bulkDelete('golongan_kelas', { nama_kelas: ['Reguler', 'Karyawan', 'Kelas Malam'] });
  },
};
