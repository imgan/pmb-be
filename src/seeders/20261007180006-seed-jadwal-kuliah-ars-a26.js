'use strict';

// Jadwal kuliah D3 Administrasi Rumah Sakit angkatan 2026 (kelas A26) — 2026/2027 Ganjil, semester 1.
// Sama seperti A24/A25: prodi ARS belum punya kurikulum, jadi jadwal tidak ditautkan ke kurikulum/Matakuliah
// Aktif; mata kuliahnya dimasukkan ke master mata kuliah (MKDU01/MKDU02 sudah ada, dipakai ulang).
// Kolom "Dosen Kordinator (NIDN)" di Excel berisi NUPTK / kode dosen, jadi dicocokkan ke nidn/nuptk/nik.
// ARS106 Aplikasi Komputer (Rahman Abdillah, Sabtu jam 1) belum dimasukkan: bentrok dengan F26 FAR108 di slot yang sama.
const KELAS = 'A26';
const TAHUN_AJARAN = { nama: '2026/2027', jenisSemester: 'GANJIL' };
const SEMESTER = 1;
const JADWAL = [
  { kode: 'ARS101', nama: 'Hubungan Masyarakat dan Komunikasi Publik Rumah Sakit', teori: 1, praktik: 1, dosen: '2607050', hari: 'SENIN', jam: 1 },
  { kode: 'ARS105', nama: 'Administrasi Kepegawaian RS', teori: 1, praktik: 2, dosen: '2850762663230232', hari: 'SENIN', jam: 2 },
  { kode: 'ARS103', nama: 'Administrasi Rumah Sakit', teori: 1, praktik: 2, dosen: '5355754655230093', hari: 'SENIN', jam: 3 },
  { kode: 'MKDU01', nama: 'Pendidikan Agama', teori: 1, praktik: 1, dosen: 'D-2203020', hari: 'SENIN', jam: 4 },
  { kode: 'MKDU02', nama: 'Pancasila dan Kewarganegaraan', teori: 1, praktik: 1, dosen: 'D-2203020', hari: 'SENIN', jam: 5 },
  { kode: 'ARS102', nama: 'Penghantar Administrasi Rekam Medis', teori: 1, praktik: 2, dosen: '3937754655230192', hari: 'KAMIS', jam: 1 },
  { kode: 'ARS107', nama: 'Manajemen Logistik Rumah Sakit', teori: 1, praktik: 2, dosen: 'D-2610041', hari: 'KAMIS', jam: 2 },
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
