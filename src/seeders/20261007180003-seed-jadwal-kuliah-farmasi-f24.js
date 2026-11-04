'use strict';

// Jadwal kuliah D3 Farmasi angkatan 2024 (kelas F24) — 2026/2027 Ganjil, semester 5.
// Mata kuliah diambil dari kurikulum Farmasi & sekaligus diaktifkan di Matakuliah Aktif (semester 5),
// supaya jadwal tertaut ke kurikulum seperti jadwal yang dibuat lewat menu.
// Kolom "Dosen Kordinator (NIDN)" di Excel berisi NUPTK / kode dosen, jadi dicocokkan ke nidn/nuptk/nik.
const KELAS = 'F24';
const TAHUN_AJARAN = { nama: '2026/2027', jenisSemester: 'GANJIL' };
const SEMESTER = 5;
const JURUSAN_FARMASI = 1;
const JADWAL = [
  { kode: 'F5103', dosen: '7155760661130153', hari: 'SELASA', jam: 1 },
  { kode: 'F5101', dosen: '1553765666230232', hari: 'SELASA', jam: 2 },
  { kode: 'F5102', dosen: '7746767668231112', hari: 'RABU', jam: 1 },
  { kode: 'F5204', dosen: '2350744645230083', hari: 'RABU', jam: 2 },
  { kode: 'F5206', dosen: 'D-2610044', hari: 'KAMIS', jam: 1 },
  { kode: 'F5405', dosen: 'D-2610045', hari: 'KAMIS', jam: 2 },
  { kode: 'F5207', dosen: 'D-2610046', hari: 'JUMAT', jam: 1 },
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
      const [[k]] = await q(
        `SELECT id, kode, mata_kuliah, sks_teori, sks_praktek, sks_lab, sks_simulasi FROM kurikulum
          WHERE jurusan_id = :jurusan AND kode = :kode AND is_delete = 0 ORDER BY tahun_kurikulum DESC LIMIT 1`,
        { jurusan: JURUSAN_FARMASI, kode: j.kode }
      );
      if (!k) throw new Error(`Kurikulum ${j.kode} tidak ditemukan`);
      const [[dosen]] = await q('SELECT id FROM dosen WHERE nidn = :v OR nuptk = :v OR nik = :v LIMIT 1', { v: j.dosen });
      if (!dosen) throw new Error(`Dosen ${j.dosen} tidak ditemukan`);
      const [[mk]] = await q('SELECT id FROM mata_kuliah WHERE kode_mk = :kode LIMIT 1', { kode: j.kode });

      await q(
        `INSERT IGNORE INTO matakuliah_aktif (tahun_ajaran_id, kurikulum_id, semester, created_by, created_at, updated_at)
          VALUES (:ta, :k, :sem, :actor, :now, :now)`,
        { ta: ta.id, k: k.id, sem: SEMESTER, actor: actorId, now }
      );

      const [[ada]] = await q('SELECT id FROM jadwal_kuliah WHERE kelas = :kelas AND kode_mata_kuliah = :kode AND tahun_ajaran_id = :ta', {
        kelas: KELAS,
        kode: j.kode,
        ta: ta.id,
      });
      if (ada) continue;
      await queryInterface.bulkInsert('jadwal_kuliah', [
        {
          kelas: KELAS,
          kode_mata_kuliah: k.kode,
          nama_mata_kuliah: k.mata_kuliah,
          sks: k.sks_teori + k.sks_praktek + k.sks_lab + k.sks_simulasi,
          sks_teori: k.sks_teori,
          sks_praktik: k.sks_praktek,
          sks_lab: k.sks_lab,
          dosen_kordinator_id: dosen.id,
          tahun_ajaran_id: ta.id,
          mata_kuliah_id: mk?.id ?? null,
          kurikulum_id: k.id,
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
    const [[ta]] = await q('SELECT id FROM tahun_ajaran WHERE nama = :nama AND jenis_semester = :jenis LIMIT 1', {
      nama: TAHUN_AJARAN.nama,
      jenis: TAHUN_AJARAN.jenisSemester,
    });
    if (!ta) return;
    const kode = JADWAL.map((j) => j.kode);
    await q('DELETE FROM jadwal_kuliah WHERE kelas = :kelas AND tahun_ajaran_id = :ta AND kode_mata_kuliah IN (:kode)', {
      kelas: KELAS,
      ta: ta.id,
      kode,
    });
    await q(
      `DELETE ma FROM matakuliah_aktif ma JOIN kurikulum k ON k.id = ma.kurikulum_id
        WHERE ma.tahun_ajaran_id = :ta AND ma.semester = :sem AND k.jurusan_id = :jurusan AND k.kode IN (:kode)`,
      { ta: ta.id, sem: SEMESTER, jurusan: JURUSAN_FARMASI, kode }
    );
  },
};
