'use strict';

const STATUS_CYCLE = ['HADIR', 'HADIR', 'HADIR', 'IZIN', 'TIDAK_HADIR', 'HADIR', 'SAKIT', 'HADIR'];

module.exports = {
  up: async (queryInterface) => {
    const [jadwalList] = await queryInterface.sequelize.query(
      'SELECT id, dosen_kordinator_id FROM jadwal_kuliah ORDER BY id ASC'
    );
    if (jadwalList.length === 0) return;

    const [users] = await queryInterface.sequelize.query("SELECT id FROM users WHERE username = 'superadmin' LIMIT 1");
    const actorId = users.length ? users[0].id : null;
    const now = new Date();

    const rows = [];
    jadwalList.forEach((jadwal, index) => {
      const status = STATUS_CYCLE[index % STATUS_CYCLE.length];
      const daysAgo = (index % 6) * 7 + (index % 3);
      const tanggal = new Date(now);
      tanggal.setDate(tanggal.getDate() - daysAgo);

      rows.push({
        jadwal_kuliah_id: jadwal.id,
        dosen_id: jadwal.dosen_kordinator_id,
        tanggal_realisasi: tanggal.toISOString().slice(0, 10),
        status,
        keterangan: status === 'IZIN' ? 'Izin acara kampus' : status === 'SAKIT' ? 'Sakit' : status === 'TIDAK_HADIR' ? 'Tidak ada keterangan' : null,
        is_delete: false,
        created_by: actorId,
        updated_by: actorId,
        created_at: now,
        updated_at: now,
      });
    });

    await queryInterface.bulkInsert('kehadiran_dosen', rows);
  },
  down: async (queryInterface) => {
    await queryInterface.bulkDelete('kehadiran_dosen', { keterangan: ['Izin acara kampus', 'Sakit', 'Tidak ada keterangan'] });
  },
};
