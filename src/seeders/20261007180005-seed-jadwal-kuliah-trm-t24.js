'use strict';

// Jadwal kuliah D4 Teknologi Rekayasa Multimedia angkatan 2024 (kelas T24) — 2026/2027 Ganjil, semester 5.
// Prodi TRM belum punya kurikulum, jadi jadwal tidak ditautkan ke kurikulum/Matakuliah Aktif; mata
// kuliahnya dimasukkan ke master mata kuliah dan ditautkan lewat mata_kuliah_id.
// Kolom "Dosen Kordinator (NIDN)" di Excel berisi NUPTK / kode dosen, jadi dicocokkan ke nidn/nuptk/nik.
const KELAS = 'T24';
const TAHUN_AJARAN = { nama: '2026/2027', jenisSemester: 'GANJIL' };
const SEMESTER = 5;
const JADWAL = [
  { kode: 'TEK529', nama: 'Komunikasi Digital', teori: 2, praktik: 0, dosen: '7155760661130153', hari: 'RABU', jam: 1 },
  { kode: 'TEK522', nama: 'Kecerdasan Buatan Multimedia', teori: 2, praktik: 0, dosen: 'D-2610049', hari: 'RABU', jam: 2 },
  { kode: 'TRM573', nama: 'Pengembangan Game Cerdas', teori: 0, praktik: 3, dosen: '3158763664130133', hari: 'KAMIS', jam: 1 },
  { kode: 'TEK513', nama: 'Workshop IoT', teori: 0, praktik: 3, dosen: '2212038', hari: 'JUMAT', jam: 1 },
  { kode: 'TEK553', nama: 'Analisis dan Perancangan Sistem', teori: 1, praktik: 2, dosen: '5942762663230332', hari: 'SABTU', jam: 1 },
  { kode: 'TRM563', nama: 'Animasi 3D', teori: 0, praktik: 3, dosen: '3158763664130133', hari: 'SABTU', jam: 2 },
  { kode: 'TRM533', nama: 'Desain Antarmuka dan Pengalaman Pengguna', teori: 2, praktik: 1, dosen: 'D-2610049', hari: 'SABTU', jam: 3 },
  { kode: 'TRM543', nama: 'Workshop Multimedia', teori: 0, praktik: 3, dosen: 'D-2610049', hari: 'SABTU', jam: 4 },
];

module.exports = {
  up: async (queryInterface) => {
    const q = (sql, replacements) => queryInterface.sequelize.query(sql, { replacements });
    const now = new Date();
    const [users] = await q("SELECT id FROM users WHERE username = 'superadmin' LIMIT 1");
    const actorId = users.length ? users[0].id : null;

    const [[ta]] = await q('SELECT id FROM tahun_ajaran WHERE nama = :nama AND jenis_semester = :jenis LIMIT 1', {
      nama: TAHUN_AJARAN.nama,
      jenis: TAHUN_AJARAN.jenisSemester,
    });
    if (!ta) throw new Error(`Tahun ajaran ${TAHUN_AJARAN.nama} ${TAHUN_AJARAN.jenisSemester} tidak ditemukan`);

    for (const j of JADWAL) {
      const sks = j.teori + j.praktik;
      const [[dosen]] = await q('SELECT id FROM dosen WHERE nidn = :v OR nuptk = :v OR nik = :v LIMIT 1', { v: j.dosen });
      if (!dosen) throw new Error(`Dosen ${j.dosen} tidak ditemukan`);

      let [[mk]] = await q('SELECT id FROM mata_kuliah WHERE kode_mk = :kode LIMIT 1', { kode: j.kode });
      if (!mk) {
        await queryInterface.bulkInsert('mata_kuliah', [
          { kode_mk: j.kode, nama_mk: j.nama, sks, is_delete: false, created_by: actorId, updated_by: actorId, created_at: now, updated_at: now },
        ]);
        [[mk]] = await q('SELECT id FROM mata_kuliah WHERE kode_mk = :kode LIMIT 1', { kode: j.kode });
      }

      const [[ada]] = await q('SELECT id FROM jadwal_kuliah WHERE kelas = :kelas AND kode_mata_kuliah = :kode AND tahun_ajaran_id = :ta', {
        kelas: KELAS,
        kode: j.kode,
        ta: ta.id,
      });
      if (ada) continue;
      await queryInterface.bulkInsert('jadwal_kuliah', [
        {
          kelas: KELAS,
          kode_mata_kuliah: j.kode,
          nama_mata_kuliah: j.nama,
          sks,
          sks_teori: j.teori,
          sks_praktik: j.praktik,
          sks_lab: 0,
          dosen_kordinator_id: dosen.id,
          tahun_ajaran_id: ta.id,
          mata_kuliah_id: mk.id,
          kurikulum_id: null,
          semester: SEMESTER,
          hari: JSON.stringify([j.hari]),
          jam: j.jam,
          ruangan: null,
          gcr: null,
          is_active: true,
          created_by: actorId,
          updated_by: actorId,
          created_at: now,
          updated_at: now,
        },
      ]);
    }
  },
  down: async (queryInterface) => {
    const q = (sql, replacements) => queryInterface.sequelize.query(sql, { replacements });
    const kode = JADWAL.map((j) => j.kode);
    const [[ta]] = await q('SELECT id FROM tahun_ajaran WHERE nama = :nama AND jenis_semester = :jenis LIMIT 1', {
      nama: TAHUN_AJARAN.nama,
      jenis: TAHUN_AJARAN.jenisSemester,
    });
    if (ta) {
      await q('DELETE FROM jadwal_kuliah WHERE kelas = :kelas AND tahun_ajaran_id = :ta AND kode_mata_kuliah IN (:kode)', {
        kelas: KELAS,
        ta: ta.id,
        kode,
      });
    }
    await q('DELETE FROM mata_kuliah WHERE kode_mk IN (:kode) AND id NOT IN (SELECT mata_kuliah_id FROM jadwal_kuliah WHERE mata_kuliah_id IS NOT NULL)', { kode });
  },
};
