'use strict';

const STATUS_CYCLE = ['HADIR', 'HADIR', 'HADIR', 'HADIR', 'IZIN', 'HADIR', 'SAKIT', 'ALPA', 'HADIR', 'HADIR'];

module.exports = {
  up: async (queryInterface) => {
    // Presensi per mahasiswa hanya bisa disimulasikan untuk kombinasi (realisasi mengajar, mahasiswa
    // KRS DISETUJUI) yang benar-benar ada — kalau belum ada data KRS/realisasi mengajar, dilewati saja
    // (nantinya terisi asli lewat portal Dosen, lihat dosenPortal.service.js#savePresensiMahasiswa).
    const [rows] = await queryInterface.sequelize.query(`
      SELECT kd.id AS kehadiran_dosen_id, krs.mahasiswa_id AS mahasiswa_id
      FROM kehadiran_dosen kd
      JOIN krs_detail kdet ON kdet.jadwal_kuliah_id = kd.jadwal_kuliah_id
      JOIN krs ON krs.id = kdet.krs_id AND krs.status = 'DISETUJUI'
      WHERE kd.is_delete = 0
      ORDER BY kd.id ASC, krs.mahasiswa_id ASC
    `);
    if (rows.length === 0) return;

    const now = new Date();
    const inserts = rows.map((row, index) => ({
      kehadiran_dosen_id: row.kehadiran_dosen_id,
      mahasiswa_id: row.mahasiswa_id,
      status: STATUS_CYCLE[index % STATUS_CYCLE.length],
      keterangan: null,
      created_by: null,
      updated_by: null,
      created_at: now,
      updated_at: now,
    }));

    await queryInterface.bulkInsert('kehadiran_mahasiswa', inserts);
  },
  down: async (queryInterface) => {
    await queryInterface.bulkDelete('kehadiran_mahasiswa', {});
  },
};
