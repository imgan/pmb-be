'use strict';

// 1. Dua mata kuliah Farmasi yang di Excel memakai kode ganda (FAR105, FAR106) — dan tertimpa saat
//    import — diberi kode baru berawalan sama, lalu dimasukkan ke kurikulum & master mata kuliah.
// 2. Kurikulum dummy D4TRM "Bahasa Pemograman Java Spring boot" (+ konversi dummy-nya) & TEST0001 dihapus.
// 3. Kurikulum D3 Manajemen Logistik disalin ke master mata kuliah (SKS = total SKS kurikulum).
const FARMASI_BARU = [
  { kode: 'FAR107', nama: 'Morfologi dan Fisiologi Tumbuhan', sksTeori: 1, sksPraktek: 2 },
  { kode: 'FAR108', nama: 'Aplikasi Komputer', sksTeori: 0, sksPraktek: 2 },
];
const JURUSAN_FARMASI = 1;
const JURUSAN_LOGISTIK = 2;
const DUMMY_KURIKULUM_KODE = ['D4TRM', 'TEST0001'];

module.exports = {
  up: async (queryInterface) => {
    const q = (sql, replacements) => queryInterface.sequelize.query(sql, { replacements });
    const now = new Date();
    const [users] = await q("SELECT id FROM users WHERE username = 'superadmin' LIMIT 1");
    const actorId = users.length ? users[0].id : null;

    // 1. Kurikulum Farmasi (atribut mengikuti baris semester 1 lain dari Excel yang sama).
    const [[tpl]] = await q(
      "SELECT tahun_ajaran_id, tahun_kurikulum FROM kurikulum WHERE jurusan_id = :j AND kode = 'FAR102' AND is_delete = 0 LIMIT 1",
      { j: JURUSAN_FARMASI }
    );
    const [adaKurikulum] = await q('SELECT kode FROM kurikulum WHERE jurusan_id = :j AND kode IN (:kode)', {
      j: JURUSAN_FARMASI,
      kode: FARMASI_BARU.map((m) => m.kode),
    });
    const hasK = new Set(adaKurikulum.map((r) => r.kode));
    const kurikulumRows = FARMASI_BARU.filter((m) => !hasK.has(m.kode)).map((m) => ({
      jurusan_id: JURUSAN_FARMASI,
      tahun_ajaran_id: tpl?.tahun_ajaran_id ?? null,
      tahun_kurikulum: tpl?.tahun_kurikulum ?? 2026,
      kode: m.kode,
      mata_kuliah: m.nama,
      kelompok_kurikulum: 'WAJIB',
      jenis_mata_kuliah: 'TEORI_PRAKTIK',
      sks_teori: m.sksTeori,
      sks_praktek: m.sksPraktek,
      sks_lab: 0,
      sks_simulasi: 0,
      semester: 1,
      metode_pembelajaran: 'Ceramah, Diskusi, Praktikum',
      tanggal_mulai_efektif: '2026-10-12',
      is_delete: false,
      created_by: actorId,
      updated_by: actorId,
      created_at: now,
      updated_at: now,
    }));
    if (kurikulumRows.length) await queryInterface.bulkInsert('kurikulum', kurikulumRows);

    // 2. Kurikulum dummy.
    const [dummy] = await q('SELECT id FROM kurikulum WHERE kode IN (:kode)', { kode: DUMMY_KURIKULUM_KODE });
    if (dummy.length) {
      const ids = dummy.map((r) => r.id);
      await q('DELETE FROM konversi_kurikulum WHERE dari_kurikulum_id IN (:ids) OR ke_kurikulum_id IN (:ids)', { ids });
      await q('DELETE FROM matakuliah_aktif WHERE kurikulum_id IN (:ids)', { ids });
      await q('UPDATE jadwal_kuliah SET kurikulum_id = NULL WHERE kurikulum_id IN (:ids)', { ids });
      await q('DELETE FROM kurikulum WHERE id IN (:ids)', { ids });
    }

    // 1 & 3. Master mata kuliah dari kurikulum Farmasi (kode baru) + Logistik.
    const [sumber] = await q(
      `SELECT kode, mata_kuliah, sks_teori + sks_praktek + sks_lab + sks_simulasi AS sks FROM kurikulum
        WHERE is_delete = 0 AND ((jurusan_id = :farmasi AND kode IN (:kodeBaru)) OR jurusan_id = :logistik)
        ORDER BY jurusan_id, semester, id`,
      { farmasi: JURUSAN_FARMASI, logistik: JURUSAN_LOGISTIK, kodeBaru: FARMASI_BARU.map((m) => m.kode) }
    );
    const [adaMk] = await q('SELECT kode_mk FROM mata_kuliah');
    const has = new Set(adaMk.map((r) => r.kode_mk));
    const mkRows = [];
    sumber.forEach((r) => {
      if (has.has(r.kode)) return;
      has.add(r.kode);
      mkRows.push({
        kode_mk: r.kode,
        nama_mk: r.mata_kuliah,
        sks: Number(r.sks),
        is_delete: false,
        created_by: actorId,
        updated_by: actorId,
        created_at: now,
        updated_at: now,
      });
    });
    if (mkRows.length) await queryInterface.bulkInsert('mata_kuliah', mkRows);
  },
  down: async (queryInterface) => {
    const q = (sql, replacements) => queryInterface.sequelize.query(sql, { replacements });
    const kodeBaru = FARMASI_BARU.map((m) => m.kode);
    await q(
      `DELETE FROM mata_kuliah WHERE kode_mk IN (:kodeBaru)
        OR kode_mk IN (SELECT kode FROM kurikulum WHERE jurusan_id = :logistik)`,
      { kodeBaru, logistik: JURUSAN_LOGISTIK }
    );
    await q('DELETE FROM kurikulum WHERE jurusan_id = :j AND kode IN (:kodeBaru)', { j: JURUSAN_FARMASI, kodeBaru });
  },
};
