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
        // Nilai dummy bervariasi per kombinasi tahun ajaran & jurusan, mensimulasikan rata-rata
        // jumlah pertemuan yang dihadiri mahasiswa sampai integrasi data presensi riil tersedia.
        const rataRataKehadiran = (15 + ((seed * 7) % 23) + (seed % 4) * 0.75).toFixed(2);
        seed += 1;
        rows.push({
          tahun_ajaran_id: ta.id,
          jurusan_id: jurusan.id,
          rata_rata_kehadiran: rataRataKehadiran,
          is_delete: false,
          created_at: now,
          updated_at: now,
        });
      });
    });

    await queryInterface.bulkInsert('presentase_kehadiran_mahasiswa', rows);
  },
  down: async (queryInterface) => {
    await queryInterface.bulkDelete('presentase_kehadiran_mahasiswa', {});
  },
};
