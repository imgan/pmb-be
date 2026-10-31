const { sequelize } = require('../models');
const obrolan = require('./obrolan.service');

/**
 * Lonceng notifikasi portal Dosen & Mahasiswa ("pihak" = { tipe: 'D' | 'M', id, tahunAjaranId? }), disusun dari data
 * yang sudah ada — tidak ada tabel notifikasi tersendiri:
 * - semua    : chat baru (obrolan grup kelas / pribadi dengan pesan belum dibaca);
 * - dosen    : mahasiswa berkomentar / bertanya di konten kelasnya, mahasiswa mengumpulkan tugas;
 * - mahasiswa: konten baru dari dosen, balasan di konten yang pernah ia komentari, tugas sudah dinilai.
 * "Baru" = lebih baru dari saat lonceng terakhir dibuka (notifikasi_baca); chat baru selama masih ada pesan belum dibaca.
 * Rentang 30 hari terakhir, maks. 30 notifikasi.
 */
const q = (sql, replacements) => sequelize.query(sql, { replacements, type: sequelize.QueryTypes.SELECT });
const HARI = 30;
const MAKS = 30;
const NAMA_DOSEN = "CONCAT_WS(', ', NULLIF(d.nama_lengkap, ''), NULLIF(d.gelar, ''))";
const potong = (s, n = 90) => {
  const t = String(s ?? '').replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
};

/** Kelas yang diampu dosen pada tahun akademik pilihan (default tahun ajaran aktif). */
const kelasDosen = (p) =>
  q(
    `SELECT j.id FROM jadwal_kuliah j JOIN tahun_ajaran t ON t.id = j.tahun_ajaran_id
      WHERE (j.dosen_kordinator_id = :id OR EXISTS (SELECT 1 FROM jadwal_kuliah_dosen_pengampu x WHERE x.jadwal_kuliah_id = j.id AND x.dosen_id = :id))
        AND ${p.tahunAjaranId ? 'j.tahun_ajaran_id = :ta' : 't.is_active = 1'}`,
    { id: p.id, ta: p.tahunAjaranId ?? 0 }
  ).then((r) => r.map((x) => Number(x.id)));

const terakhirDibaca = async (p) => {
  const [r] = await q('SELECT terakhir_dibaca AS t FROM notifikasi_baca WHERE pemilik_tipe = :tipe AND pemilik_id = :id', { tipe: p.tipe, id: p.id });
  return r?.t ? new Date(r.t) : null;
};

/** Chat dengan pesan belum dibaca → satu notifikasi per obrolan. */
const notifChat = async (p, prefix) => {
  const { obrolan: daftar } = await obrolan.listObrolan(p);
  return daftar
    .filter((o) => o.belumDibaca > 0)
    .map((o) => ({
      kunci: `chat-${o.id}`,
      tipe: 'CHAT',
      judul: `${o.belumDibaca} pesan baru · ${o.nama}`,
      isi: o.terakhir ? `${o.terakhir.pengirim}: ${potong(o.terakhir.isi)}` : '',
      waktu: o.terakhir?.waktu ?? null,
      tautan: `${prefix}/e-learning/obrolan?obrolan=${o.id}`,
      chat: true,
    }));
};

const untukDosen = async (p) => {
  const kelas = await kelasDosen(p);
  const chat = notifChat(p, '/dosen');
  if (!kelas.length) return chat;
  const [komentar, tugas] = await Promise.all([
    q(
      `SELECT km.id, km.isi, km.created_at AS waktu, m.nama_lengkap AS nama, c.id AS kontenId, c.judul, c.jadwal_kuliah_id AS jadwalId, j.nama_mata_kuliah AS mk, j.kelas
         FROM elearning_komentar km
         JOIN elearning_konten c ON c.id = km.konten_id
         JOIN jadwal_kuliah j ON j.id = c.jadwal_kuliah_id
         JOIN mahasiswa m ON m.id = km.mahasiswa_id
        WHERE c.jadwal_kuliah_id IN (:kelas) AND km.mahasiswa_id IS NOT NULL AND km.created_at >= NOW() - INTERVAL ${HARI} DAY
        ORDER BY km.created_at DESC LIMIT ${MAKS}`,
      { kelas }
    ),
    // Tugas grup: satu notifikasi per pengunggah (dikumpulkan_oleh).
    q(
      `SELECT tj.id, tj.updated_at AS waktu, tj.terlambat, m.nama_lengkap AS nama, c.id AS kontenId, c.judul, c.jadwal_kuliah_id AS jadwalId, j.nama_mata_kuliah AS mk, j.kelas
         FROM elearning_tugas_jawaban tj
         JOIN elearning_konten c ON c.id = tj.konten_id
         JOIN jadwal_kuliah j ON j.id = c.jadwal_kuliah_id
         JOIN mahasiswa m ON m.id = tj.mahasiswa_id
        WHERE c.jadwal_kuliah_id IN (:kelas) AND (tj.dikumpulkan_oleh IS NULL OR tj.dikumpulkan_oleh = tj.mahasiswa_id)
          AND tj.updated_at >= NOW() - INTERVAL ${HARI} DAY
        ORDER BY tj.updated_at DESC LIMIT ${MAKS}`,
      { kelas }
    ),
  ]);
  return [
    ...(await chat),
    ...komentar.map((r) => ({
      kunci: `komentar-${r.id}`,
      tipe: 'KOMENTAR',
      judul: `${r.nama} berkomentar di "${potong(r.judul, 50)}"`,
      isi: `“${potong(r.isi)}” · ${r.mk} ${r.kelas}`,
      waktu: r.waktu,
      tautan: `/dosen/e-learning/${r.jadwalId}?konten=${r.kontenId}&aksi=komentar`,
    })),
    ...tugas.map((r) => ({
      kunci: `tugas-${r.id}`,
      tipe: 'TUGAS',
      judul: `${r.nama} mengumpulkan tugas${Number(r.terlambat) ? ' (terlambat)' : ''}`,
      isi: `${potong(r.judul, 60)} · ${r.mk} ${r.kelas}`,
      waktu: r.waktu,
      tautan: `/dosen/e-learning/${r.jadwalId}?konten=${r.kontenId}&aksi=pengumpulan`,
    })),
  ];
};

/** Konten yang boleh dilihat mahasiswa (sama dengan e-learning mahasiswa: terbit, tersedia, penerima). */
const SQL_KONTEN_MHS = `c.is_published = 1
  AND (c.tersedia_mulai IS NULL OR c.tersedia_mulai <= NOW())
  AND (c.tersedia_sampai IS NULL OR c.tersedia_sampai >= NOW())
  AND (
    (c.target = 'KAMPUS' AND EXISTS (SELECT 1 FROM mahasiswa mm WHERE mm.id = :mhs AND mm.is_active = 1 AND mm.status_keluar IS NULL))
    OR (
      EXISTS (SELECT 1 FROM krs_detail kd JOIN krs k ON k.id = kd.krs_id AND k.status = 'DISETUJUI' WHERE kd.jadwal_kuliah_id = c.jadwal_kuliah_id AND k.mahasiswa_id = :mhs)
      AND (c.target = 'SEMUA' OR (c.target IN ('PILIHAN', 'GRUP') AND EXISTS (SELECT 1 FROM elearning_konten_mahasiswa x WHERE x.konten_id = c.id AND x.mahasiswa_id = :mhs)))
    )
  )`;
const JENIS = { MATERI: 'materi', VIDEO: 'video', KUIS: 'kuis', TUGAS: 'tugas' };

const untukMahasiswa = async (p) => {
  const [chat, konten, balasan, nilai] = await Promise.all([
    notifChat(p, '/mahasiswa'),
    q(
      `SELECT c.id, c.jenis, c.judul, c.tenggat, c.created_at AS waktu, c.jadwal_kuliah_id AS jadwalId, j.nama_mata_kuliah AS mk, ${NAMA_DOSEN} AS dosen
         FROM elearning_konten c JOIN jadwal_kuliah j ON j.id = c.jadwal_kuliah_id LEFT JOIN dosen d ON d.id = c.dosen_id
        WHERE ${SQL_KONTEN_MHS} AND c.created_at >= NOW() - INTERVAL ${HARI} DAY
        ORDER BY c.created_at DESC LIMIT ${MAKS}`,
      { mhs: p.id }
    ),
    // Komentar orang lain (dosen / mahasiswa) di konten yang pernah dikomentari mahasiswa ini, setelah komentar pertamanya.
    q(
      `SELECT km.id, km.isi, km.created_at AS waktu, COALESCE(m.nama_lengkap, ${NAMA_DOSEN}) AS nama, km.dosen_id AS dsn,
              c.id AS kontenId, c.judul, c.jadwal_kuliah_id AS jadwalId
         FROM elearning_komentar km
         JOIN elearning_konten c ON c.id = km.konten_id
         LEFT JOIN mahasiswa m ON m.id = km.mahasiswa_id
         LEFT JOIN dosen d ON d.id = km.dosen_id
        WHERE COALESCE(km.mahasiswa_id, 0) <> :mhs AND km.created_at >= NOW() - INTERVAL ${HARI} DAY
          AND km.created_at > (SELECT MIN(s.created_at) FROM elearning_komentar s WHERE s.konten_id = km.konten_id AND s.mahasiswa_id = :mhs)
          AND ${SQL_KONTEN_MHS}
        ORDER BY km.created_at DESC LIMIT ${MAKS}`,
      { mhs: p.id }
    ),
    q(
      `SELECT tj.id, tj.nilai, tj.dinilai_at AS waktu, c.id AS kontenId, c.judul, c.jadwal_kuliah_id AS jadwalId, j.nama_mata_kuliah AS mk
         FROM elearning_tugas_jawaban tj JOIN elearning_konten c ON c.id = tj.konten_id JOIN jadwal_kuliah j ON j.id = c.jadwal_kuliah_id
        WHERE tj.mahasiswa_id = :mhs AND tj.nilai IS NOT NULL AND tj.dinilai_at >= NOW() - INTERVAL ${HARI} DAY
        ORDER BY tj.dinilai_at DESC LIMIT ${MAKS}`,
      { mhs: p.id }
    ),
  ]);
  const tautanKonten = (r) => `/mahasiswa/e-learning/kelas/${r.jadwalId}?konten=${r.kontenId ?? r.id}`;
  return [
    ...chat,
    ...konten.map((r) => ({
      kunci: `konten-${r.id}`,
      tipe: 'KONTEN',
      jenisKonten: r.jenis,
      judul: `${r.dosen ?? 'Dosen'} membagikan ${JENIS[r.jenis] ?? 'konten'} baru`,
      isi: `${potong(r.judul, 60)} · ${r.mk}${r.tenggat ? ` · tenggat ${new Date(r.tenggat).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}` : ''}`,
      waktu: r.waktu,
      tautan: tautanKonten(r),
    })),
    ...balasan.map((r) => ({
      kunci: `balasan-${r.id}`,
      tipe: 'KOMENTAR',
      judul: `${r.nama}${r.dsn ? ' (dosen)' : ''} membalas di "${potong(r.judul, 50)}"`,
      isi: `“${potong(r.isi)}”`,
      waktu: r.waktu,
      tautan: tautanKonten(r),
    })),
    ...nilai.map((r) => ({
      kunci: `nilai-${r.id}`,
      tipe: 'NILAI',
      judul: `Tugas Anda sudah dinilai: ${Number(r.nilai)}`,
      isi: `${potong(r.judul, 60)} · ${r.mk}`,
      waktu: r.waktu,
      tautan: tautanKonten(r),
    })),
  ];
};

/** Daftar notifikasi terbaru + jumlah yang belum dibaca. */
const daftar = async (p) => {
  const [items, dibaca] = await Promise.all([p.tipe === 'D' ? untukDosen(p) : untukMahasiswa(p), terakhirDibaca(p)]);
  const hasil = items
    .filter((n) => n.waktu)
    .sort((a, b) => new Date(b.waktu) - new Date(a.waktu))
    .slice(0, MAKS)
    .map(({ chat, ...n }) => ({ ...n, baru: chat || !dibaca || new Date(n.waktu) > dibaca }));
  return { items: hasil, belumDibaca: hasil.filter((n) => n.baru).length };
};

/** Lonceng dibuka: notifikasi sampai saat ini dianggap sudah dibaca (chat tetap baru sampai pesannya dibuka). */
const tandaiDibaca = async (p) => {
  await sequelize.query(
    `INSERT INTO notifikasi_baca (pemilik_tipe, pemilik_id, terakhir_dibaca, created_at, updated_at) VALUES (:tipe, :id, NOW(), NOW(), NOW())
     ON DUPLICATE KEY UPDATE terakhir_dibaca = NOW(), updated_at = NOW()`,
    { replacements: { tipe: p.tipe, id: p.id } }
  );
  return daftar(p);
};

module.exports = { daftar, tandaiDibaca };
