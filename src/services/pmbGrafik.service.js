const { sequelize } = require('../models');

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

/**
 * Tahap pendaftaran PMB per bulan daftar (kohort: setiap pendaftar dihitung di bulan ia
 * mendaftar, lalu dilihat sejauh mana tahapnya). Sistem tidak menyimpan tanggal per tahap,
 * jadi tahap diturunkan dari status peserta:
 *  - Mendaftar  : semua peserta yang mendaftar di bulan tsb
 *  - Seleksi    : sudah mengikuti ujian seleksi (statusUjian bukan 'belum_ujian')
 *  - Wawancara  : lulus ujian seleksi, lanjut ke tahap wawancara (statusUjian = 'lulus')
 *  - DU         : sudah daftar ulang = sudah dibuatkan data Mahasiswa dari peserta tsb
 */
const STAGES = [
  { key: 'mendaftar', label: 'Mendaftar', sql: '1' },
  { key: 'seleksi', label: 'Seleksi', sql: "p.status_ujian <> 'belum_ujian'" },
  { key: 'wawancara', label: 'Wawancara', sql: "p.status_ujian = 'lulus'" },
  { key: 'du', label: 'DU', sql: 'm.id IS NOT NULL' },
];

const getBanding = async (tahun) => {
  const rows = await sequelize.query(
    `SELECT MONTH(p.created_at) AS bulan,
            ${STAGES.map((s) => `SUM(CASE WHEN ${s.sql} THEN 1 ELSE 0 END) AS ${s.key}`).join(',\n            ')}
       FROM peserta p
       LEFT JOIN mahasiswa m ON m.peserta_id = p.id
      WHERE p.deleted_at IS NULL AND YEAR(p.created_at) = :tahun
      GROUP BY MONTH(p.created_at)`,
    { replacements: { tahun }, type: sequelize.QueryTypes.SELECT }
  );
  const byMonth = new Map(rows.map((r) => [Number(r.bulan), r]));

  return {
    tahun,
    bulan: BULAN,
    rows: STAGES.map((s) => {
      const values = BULAN.map((_, i) => Number(byMonth.get(i + 1)?.[s.key] ?? 0));
      return { key: s.key, label: s.label, values, total: values.reduce((a, b) => a + b, 0) };
    }),
  };
};

/** Tahun yang punya data pendaftar, ditambah tahun berjalan; terbaru dulu. */
const getTahunOptions = async () => {
  const rows = await sequelize.query(
    'SELECT DISTINCT YEAR(created_at) AS tahun FROM peserta WHERE deleted_at IS NULL',
    { type: sequelize.QueryTypes.SELECT }
  );
  const years = new Set(rows.map((r) => Number(r.tahun)));
  years.add(new Date().getFullYear());
  return [...years].sort((a, b) => b - a);
};

const STATUS_MASUK_LABEL = {
  BARU: 'BARU',
  TRANSFER_LUAR: 'TRANSFER LUAR',
  TRANSFER_DALAM: 'TRANSFER DALAM',
  TRANSFER_LUAR_KARYAWAN: 'TRANSFER LUAR KARYAWAN',
  TRANSFER_DALAM_KARYAWAN: 'TRANSFER DALAM KARYAWAN',
};

/**
 * Rekap penerimaan mahasiswa: jumlah mahasiswa per kombinasi prodi, status kelas (statusMasuk),
 * status Dikti (jenis pendaftaran), status pembayaran (jenis pembiayaan) dan catatan
 * (perguruan tinggi asal). Opsional difilter tahun masuk.
 */
const getPenerimaan = async ({ tahunMasuk } = {}) => {
  const rows = await sequelize.query(
    `SELECT j.nama_jurusan AS prodi,
            m.status_masuk AS statusMasuk,
            NULLIF(TRIM(b.jenis_pendaftaran), '') AS statusDikti,
            NULLIF(TRIM(b.jenis_pembiayaan), '') AS statusPembayaran,
            NULLIF(NULLIF(TRIM(b.perguruan_tinggi_asal), ''), '0') AS catatan,
            COUNT(*) AS total
       FROM mahasiswa m
       JOIN jurusan j ON j.id = m.jurusan_id
       LEFT JOIN mahasiswa_biodata b ON b.mahasiswa_id = m.id
      ${tahunMasuk ? 'WHERE m.tahun_masuk = :tahunMasuk' : ''}
      GROUP BY prodi, statusMasuk, statusDikti, statusPembayaran, catatan
      ORDER BY prodi, statusMasuk, statusDikti, statusPembayaran, catatan`,
    { replacements: { tahunMasuk }, type: sequelize.QueryTypes.SELECT }
  );
  return rows.map((r) => ({
    prodi: r.prodi.toUpperCase(),
    statusKelas: STATUS_MASUK_LABEL[r.statusMasuk] ?? r.statusMasuk,
    statusDikti: r.statusDikti,
    statusPembayaran: r.statusPembayaran,
    catatan: r.catatan,
    total: Number(r.total),
  }));
};

/** Tahun masuk mahasiswa yang tersedia; terbaru dulu. */
const getTahunMasukOptions = async () => {
  const rows = await sequelize.query('SELECT DISTINCT tahun_masuk AS tahun FROM mahasiswa ORDER BY tahun DESC', {
    type: sequelize.QueryTypes.SELECT,
  });
  return rows.map((r) => Number(r.tahun));
};

/** "D3 Farmasi" -> "D3 - FARMASI" (format label prodi grafik DU). */
const prodiLabel = (nama) => nama.trim().toUpperCase().replace(/^([DS]\d)\s+(?:-\s*)?/, '$1 - ');

/**
 * Grafik Daftar Ulang: jumlah mahasiswa (= peserta yang sudah daftar ulang) per prodi per
 * tahun masuk. Jurusan dengan nama sama (beda golongan kelas) digabung jadi satu prodi.
 * Kolom tahun dibuat berurutan dari tahun masuk terkecil sampai terbesar.
 */
const getDaftarUlang = async () => {
  const rows = await sequelize.query(
    `SELECT j.nama_jurusan AS prodi, m.tahun_masuk AS tahun, COUNT(*) AS total
       FROM mahasiswa m
       JOIN jurusan j ON j.id = m.jurusan_id
      WHERE m.tahun_masuk IS NOT NULL
      GROUP BY j.nama_jurusan, m.tahun_masuk`,
    { type: sequelize.QueryTypes.SELECT }
  );
  if (!rows.length) return { tahun: [], rows: [] };

  const years = rows.map((r) => Number(r.tahun));
  const min = Math.min(...years);
  const tahun = Array.from({ length: Math.max(...years) - min + 1 }, (_, i) => min + i);

  const byProdi = new Map();
  rows.forEach((r) => {
    const prodi = prodiLabel(r.prodi);
    if (!byProdi.has(prodi)) byProdi.set(prodi, {});
    const values = byProdi.get(prodi);
    values[r.tahun] = (values[r.tahun] ?? 0) + Number(r.total);
  });

  return {
    tahun,
    rows: [...byProdi.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([prodi, values]) => ({
        prodi,
        values: Object.fromEntries(tahun.map((t) => [t, values[t] ?? 0])),
        total: Object.values(values).reduce((a, b) => a + b, 0),
      })),
  };
};

module.exports = { getBanding, getTahunOptions, getPenerimaan, getTahunMasukOptions, getDaftarUlang };
