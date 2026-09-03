'use strict';

module.exports = {
  up: async (queryInterface) => {
    const [tahunAjaranList] = await queryInterface.sequelize.query('SELECT id FROM tahun_ajaran ORDER BY id ASC');
    const [jurusanList] = await queryInterface.sequelize.query('SELECT id FROM jurusan ORDER BY id ASC');
    if (tahunAjaranList.length === 0 || jurusanList.length === 0) return;

    const now = new Date();
    const rows = [];
    let seed = 0;
    tahunAjaranList.forEach((ta) => {
      jurusanList.forEach((jurusan) => {
        ['UTS', 'UAS'].forEach((jenisUjian) => {
          // Nilai dummy bervariasi per kombinasi tahun ajaran, jurusan & jenis ujian, mensimulasikan
          // jumlah mahasiswa hadir ujian sampai integrasi data presensi ujian riil tersedia.
          const jumlahHadir = 10 + ((seed * 5) % 30);
          seed += 1;
          rows.push({
            tahun_ajaran_id: ta.id,
            jurusan_id: jurusan.id,
            jenis_ujian: jenisUjian,
            jumlah_hadir: jumlahHadir,
            is_delete: false,
            created_at: now,
            updated_at: now,
          });
        });
      });
    });

    await queryInterface.bulkInsert('kehadiran_ujian_mahasiswa', rows);
  },
  down: async (queryInterface) => {
    await queryInterface.bulkDelete('kehadiran_ujian_mahasiswa', {});
  },
};
