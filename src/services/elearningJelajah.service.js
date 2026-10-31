const { sequelize } = require('../models');
const ApiError = require('../utils/ApiError');
const { parseTagline } = require('../utils/elearningTagline');
const { daftarBerkas, isiBerkas, sqlSampul } = require('./elearning.service');

/**
 * Jelajah e-learning: katalog materi & video dari kelas lain yang terbit untuk seluruh peserta kelas (SEMUA) atau
 * seluruh kampus (KAMPUS), di dalam periode tayang. Kuis & tugas tidak ikut (dinilai per kelas); konten untuk
 * mahasiswa / grup tertentu juga tidak. Mahasiswa: konten SEMUA (khusus peserta kelas) hanya terlihat bila ia peserta
 * kelas tsb (KRS disetujui); konten KAMPUS terlihat oleh semua mahasiswa.
 */
const q = (sql, replacements) => sequelize.query(sql, { replacements, type: sequelize.QueryTypes.SELECT });

const DASAR = `c.is_published = 1 AND c.jenis IN ('MATERI', 'VIDEO') AND c.target IN ('SEMUA', 'KAMPUS')
  AND (c.tersedia_mulai IS NULL OR c.tersedia_mulai <= NOW()) AND (c.tersedia_sampai IS NULL OR c.tersedia_sampai >= NOW())`;

const KOLOM = `c.id, c.jenis, c.judul, c.deskripsi, c.url, c.kategori, c.tagline, c.lampiran_nama AS lampiranNama, c.pertemuan_ke AS pertemuanKe,
  c.created_at AS createdAt, c.video_urls AS videoUrls, ${sqlSampul('c', 'thumb')} AS sampul, j.id AS jadwalKuliahId, j.kelas, j.kode_mata_kuliah AS kodeMataKuliah, j.nama_mata_kuliah AS namaMataKuliah,
  mk.ikon, t.nama AS tahunAjaran, CONCAT_WS(', ', NULLIF(d.nama_lengkap, ''), NULLIF(d.gelar, '')) AS dosen,
  (SELECT COALESCE(SUM(l.jumlah), 0) FROM elearning_lihat l WHERE l.konten_id = c.id) AS dilihat,
  (SELECT COUNT(*) FROM elearning_suka s WHERE s.konten_id = c.id) AS suka`;

const DARI = `FROM elearning_konten c
  JOIN jadwal_kuliah j ON j.id = c.jadwal_kuliah_id
  LEFT JOIN mata_kuliah mk ON mk.id = j.mata_kuliah_id
  LEFT JOIN tahun_ajaran t ON t.id = j.tahun_ajaran_id
  LEFT JOIN dosen d ON d.id = c.dosen_id`;

const KRS_KELAS = `EXISTS (SELECT 1 FROM krs k JOIN krs_detail kd ON kd.krs_id = k.id WHERE k.mahasiswa_id = :mhs AND k.status = 'DISETUJUI' AND kd.jadwal_kuliah_id = c.jadwal_kuliah_id)`;

/** Syarat dasar + hak lihat: mahasiswa hanya konten KAMPUS atau konten kelas yang diikutinya. */
const dasar = (viewer) => (viewer.mahasiswaId ? `${DASAR} AND (c.target = 'KAMPUS' OR ${KRS_KELAS})` : DASAR);

/** Filter "kelas lain": mahasiswa = bukan kelas KRS-nya; dosen = bukan konten miliknya. */
const filterAsal = (viewer) => (viewer.mahasiswaId ? `AND NOT ${KRS_KELAS}` : 'AND c.dosen_id <> :dsn');

const daftarVideo = (v) => {
  try {
    const hasil = JSON.parse(v || '[]');
    return Array.isArray(hasil) ? hasil : [];
  } catch {
    return [];
  }
};

const bentuk = (r) => ({
  id: Number(r.id),
  jenis: r.jenis,
  judul: r.judul,
  deskripsi: r.deskripsi,
  url: r.url,
  kategori: r.kategori,
  tagline: parseTagline(r.tagline),
  lampiranNama: r.lampiranNama,
  pertemuanKe: r.pertemuanKe,
  createdAt: r.createdAt,
  videoUrls: daftarVideo(r.videoUrls),
  sampul: r.sampul ?? null,
  kelas: { id: Number(r.jadwalKuliahId), kelas: r.kelas, kodeMataKuliah: r.kodeMataKuliah, namaMataKuliah: r.namaMataKuliah, ikon: r.ikon ?? null, tahunAjaran: r.tahunAjaran },
  dosen: r.dosen || null,
  dilihat: Number(r.dilihat),
  suka: Number(r.suka),
});

/**
 * Daftar jelajah. Opsi: cari (judul / mata kuliah / dosen / kategori / tagline), jenis, urut ('terbaru' | 'populer'),
 * asal ('lain' = kelas lain, 'semua'), page, limit.
 */
const listJelajah = async (viewer, { cari = '', jenis = '', urut = 'terbaru', asal = 'lain', page = 1, limit = 24 } = {}) => {
  const lim = Math.min(Math.max(Number(limit) || 24, 1), 60);
  const hal = Math.max(Number(page) || 1, 1);
  const kata = String(cari).trim();
  const where = `WHERE ${dasar(viewer)}
    ${jenis === 'MATERI' || jenis === 'VIDEO' ? 'AND c.jenis = :jenis' : ''}
    ${asal === 'semua' ? '' : filterAsal(viewer)}
    ${
      kata
        ? 'AND (c.judul LIKE :kata OR j.nama_mata_kuliah LIKE :kata OR j.kode_mata_kuliah LIKE :kata OR d.nama_lengkap LIKE :kata OR c.kategori LIKE :kata OR c.tagline LIKE :kata OR c.deskripsi LIKE :kata)'
        : ''
    }`;
  const rep = { jenis, kata: `%${kata}%`, mhs: viewer.mahasiswaId ?? 0, dsn: viewer.dosenId ?? 0 };
  const [rows, [{ total }]] = await Promise.all([
    q(`SELECT ${KOLOM} ${DARI} ${where} ORDER BY ${urut === 'populer' ? 'dilihat DESC, suka DESC,' : ''} c.created_at DESC LIMIT ${lim} OFFSET ${(hal - 1) * lim}`, rep),
    q(`SELECT COUNT(*) AS total ${DARI} ${where}`, rep),
  ]);
  return { data: rows.map(bentuk), total: Number(total), page: hal, limit: lim };
};

/** Detail konten jelajah (isi & lampiran). Mahasiswa: kunjungan ikut tercatat sebagai "dilihat". */
const detailJelajah = async (viewer, kontenId) => {
  const [r] = await q(`SELECT ${KOLOM}, c.isi, c.lampiran ${DARI} WHERE ${dasar(viewer)} AND c.id = :id`, { id: Number(kontenId), mhs: viewer.mahasiswaId ?? 0 });
  if (!r) throw new ApiError(404, 'Konten tidak ditemukan atau tidak terbuka untuk dijelajah');
  if (viewer.mahasiswaId) {
    await sequelize.query(
      'INSERT INTO elearning_lihat (konten_id, mahasiswa_id, jumlah, created_at, updated_at) VALUES (:k, :m, 1, NOW(), NOW()) ON DUPLICATE KEY UPDATE jumlah = jumlah + 1, updated_at = NOW()',
      { replacements: { k: r.id, m: viewer.mahasiswaId } }
    );
  }
  return { ...bentuk(r), isi: r.isi, lampiran: r.lampiran, ...(await daftarBerkas(r.id)) };
};

/** Isi satu gambar / dokumen materi yang terbuka untuk dijelajah. */
const berkasJelajah = async (viewer, kontenId, berkasId) => {
  const [r] = await q(`SELECT c.id ${DARI} WHERE ${dasar(viewer)} AND c.id = :id`, { id: Number(kontenId), mhs: viewer.mahasiswaId ?? 0 });
  if (!r) throw new ApiError(404, 'Konten tidak ditemukan atau tidak terbuka untuk dijelajah');
  return isiBerkas(r.id, berkasId);
};

module.exports = { listJelajah, detailJelajah, berkasJelajah };
