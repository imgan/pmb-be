const {
  sequelize,
  ElearningKonten,
  ElearningKontenMahasiswa,
  ElearningKontenBerkas,
  ElearningSoal,
  ElearningJawaban,
  ElearningProgres,
  ElearningTugasJawaban,
} = require('../models');
const ApiError = require('../utils/ApiError');
const { kompresGambar } = require('../utils/kompresGambar');
const ExcelJS = require('exceljs');
const { buildWorkbook, parseWorkbookFromBase64, cellString } = require('../utils/excel');
const { parseTagline } = require('../utils/elearningTagline');
const { formatTahunAjaran } = require('../utils/tahunAjaran');
const { ensureKelasDosen, rekapKehadiranJadwal } = require('./dosenKelas.service');
const { listJadwalKuliahForDosen } = require('./dosenPortal.service');
const { jadwalPerkuliahan } = require('./kelasKuliah.service');

/**
 * E-learning per kelas (jadwal kuliah).
 * - Dosen pengajar kelas (koordinator / pengampu) membuat konten: MATERI (teks + lampiran file / link), VIDEO (link),
 *   KUIS (soal pilihan ganda, dinilai otomatis), lalu meng-assign ke SEMUA peserta kelas (KRS disetujui) atau
 *   mahasiswa PILIHAN.
 * - Mahasiswa hanya melihat konten terbit dari kelas yang diikutinya & ditujukan kepadanya; kuis dikerjakan sekali.
 */
const JENIS = ['MATERI', 'VIDEO', 'KUIS', 'TUGAS'];
const TARGET = ['SEMUA', 'PILIHAN', 'KAMPUS', 'GRUP'];
/** Target dengan daftar penerima eksplisit di elearning_konten_mahasiswa. */
const BERDAFTAR = ['PILIHAN', 'GRUP'];
const MAKS_LAMPIRAN = 10 * 1024 * 1024; // 10 MB (ukuran file asli)
const q = (sql, replacements) => sequelize.query(sql, { replacements, type: sequelize.QueryTypes.SELECT });
const round2 = (v) => Math.round(Number(v) * 100) / 100;

/** Mahasiswa aktif di kampus (penerima konten bertarget KAMPUS). */
const SQL_MHS_AKTIF = 'is_active = 1 AND status_keluar IS NULL';
const jumlahMahasiswaKampus = async () => Number((await q(`SELECT COUNT(*) AS n FROM mahasiswa WHERE ${SQL_MHS_AKTIF}`))[0].n);

/** Peserta kelas = mahasiswa dengan KRS disetujui pada jadwal tsb. */
const pesertaKelas = (jadwalKuliahId) =>
  q(
    `SELECT DISTINCT m.id, m.nim, m.nama_lengkap AS nama
       FROM krs_detail d JOIN krs k ON k.id = d.krs_id AND k.status = 'DISETUJUI' JOIN mahasiswa m ON m.id = k.mahasiswa_id
      WHERE d.jadwal_kuliah_id = :id ORDER BY m.nim`,
    { id: jadwalKuliahId }
  );

// ---------------------------------------------------------------- Dosen

/** Kelas yang diampu dosen (tahun akademik terpilih) + jumlah peserta & konten e-learning. */
const listKelasDosen = async (dosenId, tahunAjaranId) => {
  const jadwal = await listJadwalKuliahForDosen(dosenId, tahunAjaranId);
  if (!jadwal.length) return [];
  const ids = jadwal.map((j) => j.id);
  const [peserta, konten, pertemuan, terakhir, belumDinilai] = await Promise.all([
    q(
      `SELECT d.jadwal_kuliah_id AS id, COUNT(DISTINCT k.mahasiswa_id) AS n FROM krs_detail d JOIN krs k ON k.id = d.krs_id AND k.status = 'DISETUJUI'
        WHERE d.jadwal_kuliah_id IN (:ids) GROUP BY d.jadwal_kuliah_id`,
      { ids }
    ),
    q('SELECT jadwal_kuliah_id AS id, jenis, COUNT(*) AS n FROM elearning_konten WHERE jadwal_kuliah_id IN (:ids) GROUP BY jadwal_kuliah_id, jenis', { ids }),
    // Pertemuan terealisasi (presensi dosen).
    q('SELECT jadwal_kuliah_id AS id, COUNT(*) AS n FROM kehadiran_dosen WHERE jadwal_kuliah_id IN (:ids) GROUP BY jadwal_kuliah_id', { ids }),
    q('SELECT jadwal_kuliah_id AS id, MAX(updated_at) AS t FROM elearning_konten WHERE jadwal_kuliah_id IN (:ids) GROUP BY jadwal_kuliah_id', { ids }),
    // Tugas dikumpulkan yang belum dinilai (tugas grup: dihitung satu per grup pengunggah).
    q(
      `SELECT c.jadwal_kuliah_id AS id, COUNT(DISTINCT tj.konten_id, COALESCE(tj.dikumpulkan_oleh, tj.mahasiswa_id)) AS n
         FROM elearning_tugas_jawaban tj JOIN elearning_konten c ON c.id = tj.konten_id
        WHERE c.jadwal_kuliah_id IN (:ids) AND tj.nilai IS NULL GROUP BY c.jadwal_kuliah_id`,
      { ids }
    ),
  ]);
  const pesertaOf = new Map(peserta.map((r) => [Number(r.id), Number(r.n)]));
  const angkaOf = (rows) => new Map(rows.map((r) => [Number(r.id), Number(r.n)]));
  const pertemuanOf = angkaOf(pertemuan);
  const belumDinilaiOf = angkaOf(belumDinilai);
  const terakhirOf = new Map(terakhir.map((r) => [Number(r.id), r.t]));
  return jadwal.map((j) => {
    const milik = konten.filter((k) => Number(k.id) === j.id);
    const hitung = (jenis) => Number(milik.find((k) => k.jenis === jenis)?.n ?? 0);
    return {
      id: j.id,
      kelas: j.kelas,
      kodeMataKuliah: j.kodeMataKuliah,
      namaMataKuliah: j.namaMataKuliah,
      ikon: j.mataKuliah?.ikon ?? null,
      sks: j.sks,
      semester: j.semester,
      peserta: pesertaOf.get(j.id) ?? 0,
      jumlah: { materi: hitung('MATERI'), video: hitung('VIDEO'), kuis: hitung('KUIS'), tugas: hitung('TUGAS') },
      // Detail kelas.
      hari: Array.isArray(j.hari) ? j.hari : j.hari ? [j.hari] : [],
      jam: j.jam ?? null,
      ruangan: j.ruangan ?? null,
      linkKelas: j.gcr ?? null,
      peran: Number(j.dosenKordinatorId) === Number(dosenId) ? 'KOORDINATOR' : 'PENGAMPU',
      isObe: !!j.mataKuliah?.isObe,
      kelompok: j.mataKuliah?.kelompokKurikulum ?? null,
      pertemuan: pertemuanOf.get(j.id) ?? 0,
      tugasBelumDinilai: belumDinilaiOf.get(j.id) ?? 0,
      kontenTerakhir: terakhirOf.get(j.id) ?? null,
    };
  });
};

const ringkasKonten = (k, extra = {}) => ({
  id: k.id,
  jadwalKuliahId: k.jadwalKuliahId,
  jenis: k.jenis,
  judul: k.judul,
  kategori: k.kategori,
  tagline: k.tagline,
  isWajib: !!k.isWajib,
  prasyaratId: k.prasyaratId ?? null,
  dosenId: k.dosenId,
  deskripsi: k.deskripsi,
  url: k.url,
  lampiranNama: k.lampiranNama,
  adaLampiran: !!k.lampiranNama,
  pertemuanKe: k.pertemuanKe,
  tenggat: k.tenggat,
  durasiMenit: k.durasiMenit ?? null,
  acakSoal: !!k.acakSoal,
  tampilkanHasil: k.tampilkanHasil !== false,
  tersediaMulai: k.tersediaMulai ?? null,
  tersediaSampai: k.tersediaSampai ?? null,
  target: k.target,
  isPublished: k.isPublished,
  createdAt: k.createdAt,
  updatedAt: k.updatedAt,
  // Materi: link video & sampul (thumbnail gambar pertama) untuk kartu daftar.
  videoUrls: k.videoUrls ?? [],
  sampul: (k.get ? k.get('sampul') : k.sampul) ?? null,
  sampulId: (k.get ? k.get('sampulId') : k.sampulId) ?? null,
  ...extra,
});
// Sampul materi: gambar pertama (thumbnail kecil + id-nya). `alias` = nama tabel / alias konten di query.
const sqlSampul = (alias, kolom) =>
  `(SELECT b.${kolom} FROM elearning_konten_berkas b WHERE b.konten_id = ${alias}.id AND b.jenis = 'GAMBAR' ORDER BY b.urutan, b.id LIMIT 1)`;
const KOLOM_RINGKAS = {
  exclude: ['isi', 'lampiran'],
  include: [
    [sequelize.literal(sqlSampul('`ElearningKonten`', 'thumb')), 'sampul'],
    [sequelize.literal(sqlSampul('`ElearningKonten`', 'id')), 'sampulId'],
  ],
};

/** Durasi aktif (detik) tiap mahasiswa membuka satu konten: Map(mahasiswaId → detik). */
const durasiKonten = async (kontenId) =>
  new Map((await q('SELECT mahasiswa_id AS id, durasi_detik AS d FROM elearning_lihat WHERE konten_id = :k', { k: kontenId })).map((r) => [Number(r.id), Number(r.d)]));

/** Statistik dilihat per konten: total kali dibuka mahasiswa & jumlah mahasiswa unik. */
const statLihat = async (ids) => {
  if (!ids.length) return new Map();
  const rows = await q('SELECT konten_id AS id, SUM(jumlah) AS total, COUNT(*) AS mhs FROM elearning_lihat WHERE konten_id IN (:ids) GROUP BY konten_id', { ids });
  return new Map(rows.map((r) => [Number(r.id), { total: Number(r.total), mahasiswa: Number(r.mhs) }]));
};
const LIHAT_KOSONG = { total: 0, mahasiswa: 0 };

/** Nama dosen penerbit (nama + gelar) per dosenId untuk daftar konten. */
const namaDosenMap = async (konten) => {
  const ids = [...new Set(konten.map((k) => k.dosenId).filter(Boolean))];
  if (!ids.length) return new Map();
  const rows = await q("SELECT id, CONCAT_WS(', ', NULLIF(nama_lengkap, ''), NULLIF(gelar, '')) AS nama FROM dosen WHERE id IN (:ids)", { ids });
  return new Map(rows.map((r) => [Number(r.id), r.nama]));
};

/** Detail kelas untuk halaman e-learning dosen: info kelas, peserta, daftar konten + statistik penerima/kuis. */
const kelasDosen = async (dosenId, jadwalKuliahId) => {
  const jadwal = await ensureKelasDosen(jadwalKuliahId, dosenId);
  const [peserta, konten] = await Promise.all([
    pesertaKelas(jadwal.id),
    ElearningKonten.findAll({ where: { jadwalKuliahId: jadwal.id }, attributes: KOLOM_RINGKAS, order: [['pertemuanKe', 'ASC'], ['createdAt', 'DESC']] }),
  ]);
  const ids = konten.map((k) => k.id);
  const [penerima, soal, jawaban] = ids.length
    ? await Promise.all([
        q('SELECT konten_id AS id, COUNT(*) AS n FROM elearning_konten_mahasiswa WHERE konten_id IN (:ids) GROUP BY konten_id', { ids }),
        q('SELECT konten_id AS id, COUNT(*) AS n FROM elearning_soal WHERE konten_id IN (:ids) GROUP BY konten_id', { ids }),
        q(
          `SELECT konten_id AS id, COUNT(*) AS n, AVG(skor) AS rata FROM elearning_jawaban WHERE konten_id IN (:ids) GROUP BY konten_id
           UNION ALL SELECT konten_id, COUNT(*), AVG(nilai) FROM elearning_tugas_jawaban WHERE konten_id IN (:ids) GROUP BY konten_id`,
          { ids }
        ),
      ])
    : [[], [], []];
  const ambil = (rows, id, f = 'n') => Number(rows.find((r) => Number(r.id) === id)?.[f] ?? 0);
  const nKampus = konten.some((k) => k.target === 'KAMPUS') ? await jumlahMahasiswaKampus() : 0;
  const [dosenOf, lihat, rencana] = await Promise.all([
    namaDosenMap(konten),
    statLihat(konten.map((x) => x.id)),
    // Rencana pertemuan dari RPS mata kuliah (periode berlaku); gagal → tanpa judul sesi.
    jadwalPerkuliahan(jadwal.id, null).catch(() => null),
  ]);
  // Sesi pembelajaran: pertemuan 1..N (min. 16 / sesuai RPS / pertemuan konten tertinggi) + judul dari RPS.
  const jumlahPerSesi = new Map();
  konten.forEach((k) => k.pertemuanKe && jumlahPerSesi.set(k.pertemuanKe, (jumlahPerSesi.get(k.pertemuanKe) ?? 0) + 1));
  const jumlahSesi = Math.max(rencana?.pertemuan.length ?? 16, ...konten.map((k) => k.pertemuanKe ?? 0));
  const sesi = Array.from({ length: jumlahSesi }, (_, i) => {
    const ke = i + 1;
    const rp = rencana?.pertemuan.find((p) => p.pertemuanKe === ke)?.rencana;
    return {
      ke,
      judul: rp?.materi?.split('\n')[0]?.trim() || null,
      jenis: rp?.jenis ?? null,
      jumlahKonten: jumlahPerSesi.get(ke) ?? 0,
    };
  });
  return {
    kelas: {
      id: jadwal.id,
      kelas: jadwal.kelas,
      kodeMataKuliah: jadwal.kodeMataKuliah,
      namaMataKuliah: jadwal.namaMataKuliah,
      sks: jadwal.sks,
      tahunAjaran: formatTahunAjaran(jadwal.tahunAjaran),
    },
    peserta,
    sesi,
    tanpaSesi: konten.filter((k) => !k.pertemuanKe).length,
    konten: konten.map((k) =>
      ringkasKonten(k, {
        namaDosen: dosenOf.get(k.dosenId) ?? null,
        jumlahPenerima: k.target === 'SEMUA' ? peserta.length : k.target === 'KAMPUS' ? nKampus : ambil(penerima, k.id),
        jumlahSoal: ambil(soal, k.id),
        sudahMengerjakan: ambil(jawaban, k.id),
        rataSkor: ['KUIS', 'TUGAS'].includes(k.jenis) && ambil(jawaban, k.id) ? round2(ambil(jawaban, k.id, 'rata')) : null,
        dilihat: lihat.get(k.id) ?? LIHAT_KOSONG,
      })
    ),
  };
};

/**
 * Semua konten e-learning di kelas-kelas yang diampu dosen (tahun akademik terpilih) untuk tampilan katalog
 * (baris kartu per kelas): ringkasan konten + info kelas + jumlah penerima / soal / pengerjaan.
 */
const listKontenDosen = async (dosenId, tahunAjaranId) => {
  const kelas = await listKelasDosen(dosenId, tahunAjaranId);
  if (!kelas.length) return [];
  const ids = kelas.map((k) => k.id);
  const konten = await ElearningKonten.findAll({ where: { jadwalKuliahId: ids }, attributes: KOLOM_RINGKAS, order: [['createdAt', 'DESC']] });
  const kontenIds = konten.map((k) => k.id);
  const [penerima, soal, jawaban] = kontenIds.length
    ? await Promise.all([
        q('SELECT konten_id AS id, COUNT(*) AS n FROM elearning_konten_mahasiswa WHERE konten_id IN (:ids) GROUP BY konten_id', { ids: kontenIds }),
        q('SELECT konten_id AS id, COUNT(*) AS n FROM elearning_soal WHERE konten_id IN (:ids) GROUP BY konten_id', { ids: kontenIds }),
        q(
          `SELECT konten_id AS id, COUNT(*) AS n, AVG(skor) AS rata FROM elearning_jawaban WHERE konten_id IN (:ids) GROUP BY konten_id
           UNION ALL SELECT konten_id, COUNT(*), AVG(nilai) FROM elearning_tugas_jawaban WHERE konten_id IN (:ids) GROUP BY konten_id`,
          { ids: kontenIds }
        ),
      ])
    : [[], [], []];
  const ambil = (rows, id, f = 'n') => Number(rows.find((r) => Number(r.id) === id)?.[f] ?? 0);
  const kelasOf = new Map(kelas.map((k) => [k.id, k]));
  const nKampus = konten.some((k) => k.target === 'KAMPUS') ? await jumlahMahasiswaKampus() : 0;
  const [dosenOf, lihat, interaksi] = await Promise.all([namaDosenMap(konten), statLihat(konten.map((x) => x.id)), statInteraksi(konten.map((x) => x.id), dosenId)]);
  return kelas
    .map((k) => ({
      kelas: { id: k.id, kelas: k.kelas, kodeMataKuliah: k.kodeMataKuliah, namaMataKuliah: k.namaMataKuliah, ikon: k.ikon, sks: k.sks, peserta: k.peserta },
      konten: konten
        .filter((c) => c.jadwalKuliahId === k.id)
        .map((c) =>
          ringkasKonten(c, {
            namaDosen: dosenOf.get(c.dosenId) ?? null,
            jumlahPenerima: c.target === 'SEMUA' ? kelasOf.get(k.id).peserta : c.target === 'KAMPUS' ? nKampus : ambil(penerima, c.id),
            jumlahSoal: ambil(soal, c.id),
            sudahMengerjakan: ambil(jawaban, c.id),
            rataSkor: ['KUIS', 'TUGAS'].includes(c.jenis) && ambil(jawaban, c.id) ? round2(ambil(jawaban, c.id, 'rata')) : null,
            dilihat: lihat.get(c.id) ?? LIHAT_KOSONG,
            interaksi: interaksi.get(c.id) ?? { suka: 0, disukai: false, komentar: 0 },
          })
        ),
    }))
    .filter((g) => g.konten.length);
};

/**
 * Laporan e-learning satu kelas (dosen):
 * - kuis: matriks peserta × kuis (skor, null = belum mengerjakan / bukan penerima) + rata-rata per kuis & per mahasiswa;
 * - video & materi: per konten jumlah penerima, mahasiswa yang melihat, total dilihat, yang menandai selesai, serta
 *   rincian per mahasiswa (berapa kali melihat, terakhir melihat, selesai).
 * Hanya konten terbit yang dihitung.
 */
const laporanKelas = async (dosenId, jadwalKuliahId) => {
  const jadwal = await ensureKelasDosen(jadwalKuliahId, dosenId);
  const [peserta, konten] = await Promise.all([
    pesertaKelas(jadwal.id),
    ElearningKonten.findAll({ where: { jadwalKuliahId: jadwal.id, isPublished: true }, attributes: KOLOM_RINGKAS, order: [['pertemuanKe', 'ASC'], ['createdAt', 'ASC']] }),
  ]);
  const ids = konten.map((k) => k.id);
  const [penerima, jawaban, lihat, progres] = ids.length
    ? await Promise.all([
        q('SELECT konten_id AS kontenId, mahasiswa_id AS mahasiswaId FROM elearning_konten_mahasiswa WHERE konten_id IN (:ids)', { ids }),
        q('SELECT konten_id AS kontenId, mahasiswa_id AS mahasiswaId, skor, benar, jumlah_soal AS jumlahSoal, created_at AS dikirim FROM elearning_jawaban WHERE konten_id IN (:ids)', { ids }),
        q('SELECT konten_id AS kontenId, mahasiswa_id AS mahasiswaId, jumlah, durasi_detik AS durasi, updated_at AS terakhir FROM elearning_lihat WHERE konten_id IN (:ids)', { ids }),
        q('SELECT konten_id AS kontenId, mahasiswa_id AS mahasiswaId, created_at AS selesai FROM elearning_progres WHERE konten_id IN (:ids)', { ids }),
      ])
    : [[], [], [], []];
  const idPeserta = new Set(peserta.map((p) => p.id));
  // Penerima per konten (SEMUA = seluruh peserta kelas).
  const tujuan = new Map(
    konten.map((k) => [k.id, !BERDAFTAR.includes(k.target) ? new Set(idPeserta) : new Set(penerima.filter((p) => p.kontenId === k.id && idPeserta.has(p.mahasiswaId)).map((p) => p.mahasiswaId))])
  );
  const rataDari = (list) => (list.length ? round2(list.reduce((s, v) => s + v, 0) / list.length) : null);

  const kuis = konten.filter((k) => k.jenis === 'KUIS');
  const skorOf = new Map(jawaban.map((j) => [`${j.kontenId}|${j.mahasiswaId}`, Number(j.skor)]));
  const nilai = peserta.map((p) => {
    const skor = Object.fromEntries(kuis.map((k) => [k.id, tujuan.get(k.id).has(p.id) ? skorOf.get(`${k.id}|${p.id}`) ?? null : undefined]));
    const ada = Object.values(skor).filter((v) => typeof v === 'number');
    return { ...p, skor, rata: rataDari(ada), dikerjakan: ada.length, ditugaskan: Object.values(skor).filter((v) => v !== undefined).length };
  });

  const bacaan = konten.filter((k) => k.jenis === 'MATERI' || k.jenis === 'VIDEO');
  const kontenBacaan = bacaan.map((k) => {
    const target = tujuan.get(k.id);
    const rows = peserta
      .filter((p) => target.has(p.id))
      .map((p) => {
        const l = lihat.find((x) => x.kontenId === k.id && x.mahasiswaId === p.id);
        const s = progres.find((x) => x.kontenId === k.id && x.mahasiswaId === p.id);
        return { ...p, dilihat: l ? Number(l.jumlah) : 0, durasi: l ? Number(l.durasi) : 0, terakhirDilihat: l?.terakhir ?? null, selesai: s?.selesai ?? null };
      });
    return {
      ...ringkasKonten(k),
      penerima: rows.length,
      mahasiswaMelihat: rows.filter((r) => r.dilihat > 0).length,
      totalDilihat: rows.reduce((s, r) => s + r.dilihat, 0),
      mahasiswaSelesai: rows.filter((r) => r.selesai).length,
      rows,
    };
  });

  return {
    kelas: { id: jadwal.id, kelas: jadwal.kelas, kodeMataKuliah: jadwal.kodeMataKuliah, namaMataKuliah: jadwal.namaMataKuliah, tahunAjaran: formatTahunAjaran(jadwal.tahunAjaran) },
    peserta: peserta.length,
    kuis: kuis.map((k) => {
      const skor = jawaban.filter((j) => j.kontenId === k.id && tujuan.get(k.id).has(j.mahasiswaId)).map((j) => Number(j.skor));
      return { id: k.id, judul: k.judul, pertemuanKe: k.pertemuanKe, isWajib: !!k.isWajib, penerima: tujuan.get(k.id).size, mengerjakan: skor.length, rata: rataDari(skor) };
    }),
    nilai,
    konten: kontenBacaan,
  };
};

/**
 * Ringkasan popup setelah dosen login (tahun akademik terpilih, atau tahun ajaran aktif):
 * - jadwal: kelas yang diampu beserta hari (["SENIN", ...]), jam ke-, ruangan — untuk kalender "Jadwal Minggu Ini";
 * - tugas: kuis & tugas e-learning terbit yang masih ada penerima belum mengerjakan / mengumpulkan (tenggat terdekat dulu).
 */
const ringkasanDosen = async (dosenId, tahunAjaranId) => {
  const taId = tahunAjaranId || (await q('SELECT id FROM tahun_ajaran WHERE is_active = 1 ORDER BY id DESC LIMIT 1'))[0]?.id || null;
  const kelas = await listJadwalKuliahForDosen(dosenId, taId);
  const jadwal = kelas.map((j) => ({
    id: j.id,
    kelas: j.kelas,
    kodeMataKuliah: j.kodeMataKuliah,
    namaMataKuliah: j.namaMataKuliah,
    hari: (Array.isArray(j.hari) ? j.hari : []).map((h) => String(h).toUpperCase()),
    jam: j.jam,
    ruangan: j.ruangan,
  }));
  const ids = kelas.map((j) => j.id);
  if (!ids.length) return { jadwal, tugas: [] };
  const kuis = await ElearningKonten.findAll({
    where: { jadwalKuliahId: ids, jenis: ['KUIS', 'TUGAS'], isPublished: true },
    attributes: ['id', 'jadwalKuliahId', 'jenis', 'judul', 'tenggat', 'target', 'isWajib'],
  });
  const kuisIds = kuis.map((k) => k.id);
  const [peserta, penerima, jawaban] = kuisIds.length
    ? await Promise.all([
        q(
          `SELECT d.jadwal_kuliah_id AS id, COUNT(DISTINCT k.mahasiswa_id) AS n FROM krs_detail d JOIN krs k ON k.id = d.krs_id AND k.status = 'DISETUJUI'
            WHERE d.jadwal_kuliah_id IN (:ids) GROUP BY d.jadwal_kuliah_id`,
          { ids }
        ),
        q('SELECT konten_id AS id, COUNT(*) AS n FROM elearning_konten_mahasiswa WHERE konten_id IN (:ids) GROUP BY konten_id', { ids: kuisIds }),
        q(
          `SELECT konten_id AS id, COUNT(*) AS n FROM elearning_jawaban WHERE konten_id IN (:ids) GROUP BY konten_id
           UNION ALL SELECT konten_id, COUNT(*) FROM elearning_tugas_jawaban WHERE konten_id IN (:ids) GROUP BY konten_id`,
          { ids: kuisIds }
        ),
      ])
    : [[], [], []];
  const ambil = (rows, id) => Number(rows.find((r) => Number(r.id) === id)?.n ?? 0);
  const nKampus = kuis.some((k) => k.target === 'KAMPUS') ? await jumlahMahasiswaKampus() : 0;
  const kelasOf = new Map(kelas.map((j) => [j.id, j]));
  const sekarang = new Date();
  const tugas = kuis
    .map((k) => {
      const total = k.target === 'SEMUA' ? ambil(peserta, k.jadwalKuliahId) : k.target === 'KAMPUS' ? nKampus : ambil(penerima, k.id);
      const sudah = ambil(jawaban, k.id);
      const j = kelasOf.get(k.jadwalKuliahId);
      return {
        id: k.id,
        jadwalKuliahId: k.jadwalKuliahId,
        jenis: k.jenis,
        judul: k.judul,
        isWajib: !!k.isWajib,
        tenggat: k.tenggat,
        lewat: !!k.tenggat && new Date(k.tenggat) < sekarang,
        kelas: j?.kelas,
        kodeMataKuliah: j?.kodeMataKuliah,
        namaMataKuliah: j?.namaMataKuliah,
        penerima: total,
        sudah,
        belum: Math.max(total - sudah, 0),
      };
    })
    .filter((t) => t.belum > 0)
    // Yang masih berjalan & tenggat terdekat dulu; tanpa tenggat setelahnya; yang sudah lewat paling akhir.
    .sort((a, b) => Number(a.lewat) - Number(b.lewat) || (a.tenggat ? new Date(a.tenggat) : Infinity) - (b.tenggat ? new Date(b.tenggat) : Infinity));
  return { jadwal, tugas };
};

// ---------------------------------------------------------------- Interaksi timeline (suka & komentar)

/** Jumlah suka, apakah disukai dosen ini, dan jumlah komentar per konten. */
const statInteraksi = async (ids, dosenId) => {
  if (!ids.length) return new Map();
  const [suka, komentar] = await Promise.all([
    q('SELECT konten_id AS id, COUNT(*) AS n, SUM(dosen_id = :dosenId) AS saya FROM elearning_suka WHERE konten_id IN (:ids) GROUP BY konten_id', { ids, dosenId }),
    q('SELECT konten_id AS id, COUNT(*) AS n FROM elearning_komentar WHERE konten_id IN (:ids) GROUP BY konten_id', { ids }),
  ]);
  return new Map(
    ids.map((id) => {
      const s = suka.find((r) => Number(r.id) === id);
      return [id, { suka: Number(s?.n ?? 0), disukai: Number(s?.saya ?? 0) > 0, komentar: Number(komentar.find((r) => Number(r.id) === id)?.n ?? 0) }];
    })
  );
};

/** Suka / batal suka konten oleh dosen pengajar kelasnya. */
const toggleSukaDosen = async (dosenId, kontenId) => {
  const konten = await findKontenDosen(dosenId, kontenId);
  const [ada] = await q('SELECT id FROM elearning_suka WHERE konten_id = :k AND dosen_id = :d LIMIT 1', { k: konten.id, d: dosenId });
  if (ada) await sequelize.query('DELETE FROM elearning_suka WHERE id = :id', { replacements: { id: ada.id } });
  else await sequelize.query('INSERT INTO elearning_suka (konten_id, dosen_id, created_at, updated_at) VALUES (:k, :d, NOW(), NOW())', { replacements: { k: konten.id, d: dosenId } });
  const [r] = await q('SELECT COUNT(*) AS n FROM elearning_suka WHERE konten_id = :k', { k: konten.id });
  return { disukai: !ada, suka: Number(r.n) };
};

/** Komentar konten (terlama → terbaru) dengan nama pelaku (dosen / mahasiswa). */
const listKomentarDosen = async (dosenId, kontenId) => {
  const konten = await findKontenDosen(dosenId, kontenId);
  const rows = await q(
    `SELECT c.id, c.isi, c.created_at AS createdAt, c.dosen_id AS dosenId, c.mahasiswa_id AS mahasiswaId,
            COALESCE(CONCAT_WS(', ', NULLIF(d.nama_lengkap, ''), NULLIF(d.gelar, '')), m.nama_lengkap) AS nama
       FROM elearning_komentar c
       LEFT JOIN dosen d ON d.id = c.dosen_id
       LEFT JOIN mahasiswa m ON m.id = c.mahasiswa_id
      WHERE c.konten_id = :k ORDER BY c.created_at ASC, c.id ASC`,
    { k: konten.id }
  );
  return rows.map((r) => ({
    id: r.id,
    isi: r.isi,
    createdAt: r.createdAt,
    nama: r.nama ?? '-',
    peran: r.dosenId ? 'DOSEN' : 'MAHASISWA',
    milikSaya: Number(r.dosenId) === Number(dosenId),
  }));
};

const tambahKomentarDosen = async (dosenId, kontenId, isi) => {
  const konten = await findKontenDosen(dosenId, kontenId);
  const teksBersih = String(isi ?? '').trim();
  if (!teksBersih) throw new ApiError(400, 'Komentar tidak boleh kosong');
  await sequelize.query('INSERT INTO elearning_komentar (konten_id, dosen_id, isi, created_at, updated_at) VALUES (:k, :d, :isi, NOW(), NOW())', {
    replacements: { k: konten.id, d: dosenId, isi: teksBersih.slice(0, 2000) },
  });
  return listKomentarDosen(dosenId, konten.id);
};

/** Hapus komentar: dosen pengajar kelas boleh menghapus komentar apa pun di kontennya (moderasi). */
const hapusKomentarDosen = async (dosenId, komentarId) => {
  const [k] = await q('SELECT id, konten_id AS kontenId FROM elearning_komentar WHERE id = :id', { id: komentarId });
  if (!k) throw new ApiError(404, 'Komentar tidak ditemukan');
  await findKontenDosen(dosenId, k.kontenId);
  await sequelize.query('DELETE FROM elearning_komentar WHERE id = :id', { replacements: { id: k.id } });
};

const findKontenDosen = async (dosenId, kontenId) => {
  const konten = await ElearningKonten.findByPk(kontenId);
  if (!konten) throw new ApiError(404, 'Konten e-learning tidak ditemukan');
  await ensureKelasDosen(konten.jadwalKuliahId, dosenId);
  return konten;
};

// ---- Materi: Gambar, Video (link YouTube / Google Drive), Dokumen — masing-masing bisa lebih dari satu ----
const MAKS_VIDEO = 10;
const MAKS_BERKAS = 20; // per jenis per konten
const MAKS_GAMBAR = 10 * 1024 * 1024; // ukuran asli; dikompres server sebelum disimpan
const LINK_VIDEO = /^https?:\/\/((www\.|m\.)?youtube\.com\/|youtu\.be\/|drive\.google\.com\/)/i;
const EKSTENSI_DOKUMEN = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'zip', 'txt'];

/** Link video materi: hanya YouTube / Google Drive, tanpa duplikat. */
const bersihkanVideo = (list) => {
  const hasil = [...new Set((Array.isArray(list) ? list : []).map((u) => String(u ?? '').trim()).filter(Boolean))];
  if (hasil.length > MAKS_VIDEO) throw new ApiError(400, `Link video maksimal ${MAKS_VIDEO}`);
  const salah = hasil.find((u) => !LINK_VIDEO.test(u));
  if (salah) throw new ApiError(400, `Link video harus dari YouTube atau Google Drive: ${salah}`);
  return hasil;
};

/** Daftar gambar & dokumen materi (tanpa isi file). */
const daftarBerkas = async (kontenId) => {
  const rows = await ElearningKontenBerkas.findAll({
    where: { kontenId },
    attributes: ['id', 'jenis', 'nama', 'tipe', 'ukuran'],
    order: [['jenis', 'ASC'], ['urutan', 'ASC'], ['id', 'ASC']],
    raw: true,
  });
  return { gambar: rows.filter((r) => r.jenis === 'GAMBAR'), dokumen: rows.filter((r) => r.jenis === 'DOKUMEN') };
};

/** Dosen: unggah satu gambar / dokumen ke materi. Gambar dikompres & dibuatkan thumbnail sampul di server. */
const tambahBerkas = async (dosenId, kontenId, { jenis, nama, data }) => {
  const konten = await findKontenDosen(dosenId, kontenId);
  if (konten.jenis !== 'MATERI') throw new ApiError(400, 'Gambar & dokumen hanya untuk konten materi');
  const cocok = /^data:([^;,]*)?;base64,/.exec(String(data));
  if (!cocok) throw new ApiError(400, 'Format file tidak valid');
  const ukuranAsli = ukuranDataUrl(data);
  if (jenis === 'GAMBAR') {
    if (!String(cocok[1]).startsWith('image/')) throw new ApiError(400, 'File gambar harus berupa gambar (JPG, PNG, dll)');
    if (ukuranAsli > MAKS_GAMBAR) throw new ApiError(400, 'Ukuran gambar maksimal 10 MB');
  } else {
    const ekstensi = String(nama).split('.').pop().toLowerCase();
    if (!EKSTENSI_DOKUMEN.includes(ekstensi)) throw new ApiError(400, 'Dokumen harus PDF, Word, PowerPoint, Excel, ZIP, atau TXT');
    if (ukuranAsli > MAKS_LAMPIRAN) throw new ApiError(400, 'Ukuran dokumen maksimal 10 MB');
  }
  const jumlah = await ElearningKontenBerkas.count({ where: { kontenId: konten.id, jenis } });
  if (jumlah >= MAKS_BERKAS) throw new ApiError(400, `Maksimal ${MAKS_BERKAS} ${jenis === 'GAMBAR' ? 'gambar' : 'dokumen'} per materi`);
  const simpan =
    jenis === 'GAMBAR'
      ? await kompresGambar(data, nama)
      : { data, tipe: cocok[1] || null, ukuran: ukuranAsli, nama, thumb: null };
  const berkas = await ElearningKontenBerkas.create({
    kontenId: konten.id,
    jenis,
    nama: String(simpan.nama).slice(0, 255),
    tipe: simpan.tipe,
    ukuran: simpan.ukuran,
    data: simpan.data,
    thumb: simpan.thumb,
    urutan: jumlah + 1,
  });
  return { id: berkas.id, ukuranAsli, ukuran: simpan.ukuran };
};

const hapusBerkas = async (dosenId, kontenId, berkasId) => {
  const konten = await findKontenDosen(dosenId, kontenId);
  const n = await ElearningKontenBerkas.destroy({ where: { id: Number(berkasId), kontenId: konten.id } });
  if (!n) throw new ApiError(404, 'Berkas tidak ditemukan');
};

const isiBerkas = async (kontenId, berkasId) => {
  const b = await ElearningKontenBerkas.findOne({ where: { id: Number(berkasId), kontenId }, attributes: ['id', 'nama', 'tipe', 'data'], raw: true });
  if (!b) throw new ApiError(404, 'Berkas tidak ditemukan');
  return b;
};
const berkasDosen = async (dosenId, kontenId, berkasId) => isiBerkas((await findKontenDosen(dosenId, kontenId)).id, berkasId);

/** Detail konten untuk form ubah dosen: semua kolom, penerima (target PILIHAN / GRUP + susunan grup), soal + kunci jawaban. */
const getKontenDosen = async (dosenId, kontenId) => {
  const konten = await findKontenDosen(dosenId, kontenId);
  const [penerima, soal, jumlahJawaban, berkas] = await Promise.all([
    ElearningKontenMahasiswa.findAll({ where: { kontenId: konten.id }, attributes: ['mahasiswaId', 'grupKe', 'grupNama'], order: [['grupKe', 'ASC'], ['id', 'ASC']], raw: true }),
    ElearningSoal.findAll({ where: { kontenId: konten.id }, order: [['urutan', 'ASC'], ['id', 'ASC']] }),
    ElearningJawaban.count({ where: { kontenId: konten.id } }),
    daftarBerkas(konten.id),
  ]);
  return {
    ...ringkasKonten(konten, { namaDosen: (await namaDosenMap([konten])).get(konten.dosenId) ?? null }),
    isi: konten.isi,
    lampiran: konten.lampiran,
    videoUrls: konten.videoUrls,
    ...berkas,
    penerima: penerima.map((p) => p.mahasiswaId),
    grup: konten.target === 'GRUP' ? susunGrup(penerima) : [],
    soal: soal.map((s) => ({ id: s.id, pertanyaan: s.pertanyaan, pilihan: s.pilihan, jawabanBenar: s.jawabanBenar })),
    // Soal kuis terkunci bila sudah ada mahasiswa yang mengerjakan.
    soalTerkunci: jumlahJawaban > 0,
  };
};

/** Baris penerima (grupKe, grupNama, mahasiswaId) → [{ nama, anggota: [mahasiswaId] }] urut nomor grup. */
const susunGrup = (rows) => {
  const grup = new Map();
  rows.forEach((r) => {
    if (!r.grupKe) return;
    if (!grup.has(r.grupKe)) grup.set(r.grupKe, { nama: r.grupNama || `Grup ${r.grupKe}`, anggota: [] });
    grup.get(r.grupKe).anggota.push(r.mahasiswaId);
  });
  return [...grup.entries()].sort((a, b) => a[0] - b[0]).map(([, g]) => g);
};

const ukuranDataUrl = (dataUrl) => {
  const base64 = String(dataUrl).split(',')[1] ?? '';
  return Math.floor((base64.length * 3) / 4);
};

/** Tambah / ubah konten (+ penerima & soal) dalam satu transaksi. */
const saveKonten = async (dosenId, jadwalKuliahId, payload, kontenId = null) => {
  const lama = kontenId ? await findKontenDosen(dosenId, kontenId) : null;
  const jadwal = await ensureKelasDosen(lama ? lama.jadwalKuliahId : jadwalKuliahId, dosenId);
  const jenis = lama ? lama.jenis : payload.jenis;
  if (!JENIS.includes(jenis)) throw new ApiError(400, 'Jenis konten tidak valid');
  if (jenis === 'VIDEO' && !payload.url) throw new ApiError(400, 'Link video wajib diisi');
  const videoUrls = jenis === 'MATERI' ? bersihkanVideo(payload.videoUrls) : [];
  if (jenis === 'MATERI' && !payload.isi && !payload.url && !payload.lampiran && !lama?.lampiranNama && !videoUrls.length) {
    // Gambar / dokumen diunggah setelah materi tersimpan: hitung yang akan diunggah + yang sudah ada.
    const adaBerkas = Number(payload.jumlahBerkasBaru) > 0 || (lama && (await ElearningKontenBerkas.count({ where: { kontenId: lama.id } })) > 0);
    if (!adaBerkas) throw new ApiError(400, 'Materi wajib berisi teks, gambar, video, dokumen, atau link');
  }
  if (jenis === 'TUGAS' && !payload.isi && !payload.deskripsi && !payload.lampiran && !lama?.lampiranNama) {
    throw new ApiError(400, 'Tugas wajib berisi instruksi atau lampiran soal');
  }
  if (payload.lampiran && ukuranDataUrl(payload.lampiran) > MAKS_LAMPIRAN) throw new ApiError(400, 'Ukuran lampiran maksimal 10 MB');
  // Periode tayang: mahasiswa hanya melihat konten di antara tersedia_mulai & tersedia_sampai.
  const tersediaMulai = payload.tersediaMulai ? new Date(payload.tersediaMulai) : null;
  const tersediaSampai = payload.tersediaSampai ? new Date(payload.tersediaSampai) : null;
  if (tersediaMulai && tersediaSampai && tersediaSampai <= tersediaMulai) throw new ApiError(400, 'Akhir periode tayang harus setelah awal periode');
  if (!TARGET.includes(payload.target ?? 'SEMUA')) throw new ApiError(400, 'Target pembagian tidak valid');

  // Prasyarat: konten lain di kelas yang sama, bukan dirinya sendiri, dan tidak membentuk rantai melingkar.
  const prasyaratId = Number(payload.prasyaratId) || null;
  if (prasyaratId) {
    if (lama && prasyaratId === lama.id) throw new ApiError(400, 'Konten tidak bisa menjadi prasyarat dirinya sendiri');
    const syarat = await ElearningKonten.findByPk(prasyaratId, { attributes: ['id', 'jadwalKuliahId'] });
    if (!syarat || syarat.jadwalKuliahId !== jadwal.id) throw new ApiError(400, 'Prasyarat harus konten dari kelas yang sama');
    if (lama) {
      // Telusuri rantai prasyarat dari konten terpilih; bila kembali ke konten ini berarti melingkar.
      let cek = prasyaratId;
      for (let i = 0; cek && i < 500; i += 1) {
        if (cek === lama.id) throw new ApiError(400, 'Prasyarat melingkar: konten terpilih (langsung / tidak langsung) mensyaratkan konten ini');
        cek = (await ElearningKonten.findByPk(cek, { attributes: ['prasyaratId'] }))?.prasyaratId ?? null;
      }
    }
  }

  const peserta = await pesertaKelas(jadwal.id);
  const idPeserta = new Set(peserta.map((p) => p.id));
  // Baris penerima: PILIHAN = daftar mahasiswa; GRUP = anggota tiap grup (grup kosong dibuang, nomor grup berurutan).
  let penerima = [];
  if (payload.target === 'PILIHAN') {
    penerima = [...new Set((payload.penerima ?? []).map(Number))].map((mahasiswaId) => ({ mahasiswaId, grupKe: null, grupNama: null }));
    if (!penerima.length) throw new ApiError(400, 'Pilih minimal satu mahasiswa penerima');
  }
  if (payload.target === 'GRUP') {
    const terisi = (payload.grup ?? []).filter((g) => (g.anggota ?? []).length);
    if (!terisi.length) throw new ApiError(400, 'Isi minimal satu grup dengan anggota');
    const sudah = new Set();
    terisi.forEach((g, i) => {
      const nama = String(g.nama ?? '').trim() || `Grup ${i + 1}`;
      [...new Set(g.anggota.map(Number))].forEach((mahasiswaId) => {
        if (sudah.has(mahasiswaId)) throw new ApiError(400, 'Satu mahasiswa hanya boleh berada di satu grup');
        sudah.add(mahasiswaId);
        penerima.push({ mahasiswaId, grupKe: i + 1, grupNama: nama });
      });
    });
  }
  if (penerima.some((p) => !idPeserta.has(p.mahasiswaId))) throw new ApiError(400, 'Penerima harus mahasiswa peserta kelas ini');

  let soal = null;
  if (jenis === 'KUIS') {
    soal = (payload.soal ?? []).map((s, i) => {
      const pilihan = (s.pilihan ?? []).map((p) => String(p ?? '').trim());
      if (!String(s.pertanyaan ?? '').trim()) throw new ApiError(400, `Pertanyaan soal ${i + 1} wajib diisi`);
      if (pilihan.length < 2 || pilihan.some((p) => !p)) throw new ApiError(400, `Soal ${i + 1}: minimal 2 pilihan jawaban & tidak boleh kosong`);
      if (!Number.isInteger(s.jawabanBenar) || s.jawabanBenar < 0 || s.jawabanBenar >= pilihan.length) {
        throw new ApiError(400, `Soal ${i + 1}: tentukan jawaban yang benar`);
      }
      return { urutan: i + 1, pertanyaan: String(s.pertanyaan).trim(), pilihan, jawabanBenar: s.jawabanBenar };
    });
    if (!soal.length) throw new ApiError(400, 'Kuis minimal berisi satu soal');
    if (lama && (await ElearningJawaban.count({ where: { kontenId: lama.id } }))) {
      // Sudah ada yang mengerjakan: soal tidak boleh berubah (skor lama jadi tidak sah).
      const sekarang = (await ElearningSoal.findAll({ where: { kontenId: lama.id }, order: [['urutan', 'ASC'], ['id', 'ASC']] })).map((s) => ({
        pertanyaan: s.pertanyaan,
        pilihan: s.pilihan,
        jawabanBenar: s.jawabanBenar,
      }));
      const baru = soal.map(({ pertanyaan, pilihan, jawabanBenar }) => ({ pertanyaan, pilihan, jawabanBenar }));
      if (JSON.stringify(sekarang) !== JSON.stringify(baru)) throw new ApiError(400, 'Soal tidak bisa diubah karena sudah ada mahasiswa yang mengerjakan kuis ini');
      soal = null;
    }
  }

  const values = {
    jadwalKuliahId: jadwal.id,
    dosenId,
    jenis,
    judul: String(payload.judul).trim(),
    kategori: payload.kategori?.trim() || null,
    tagline: payload.tagline,
    isWajib: !!payload.isWajib,
    prasyaratId,
    deskripsi: payload.deskripsi?.trim() || null,
    isi: jenis === 'MATERI' || jenis === 'TUGAS' ? payload.isi?.trim() || null : null,
    url: jenis === 'KUIS' ? null : payload.url?.trim() || null,
    videoUrls,
    pertemuanKe: payload.pertemuanKe || null,
    tenggat: jenis === 'KUIS' || jenis === 'TUGAS' ? payload.tenggat || null : null,
    durasiMenit: jenis === 'KUIS' ? Number(payload.durasiMenit) || null : null,
    acakSoal: jenis === 'KUIS' && !!payload.acakSoal,
    tampilkanHasil: jenis !== 'KUIS' || payload.tampilkanHasil !== false,
    tersediaMulai,
    tersediaSampai,
    target: TARGET.includes(payload.target) ? payload.target : 'SEMUA',
    isPublished: payload.isPublished !== false,
  };
  // Lampiran: undefined = tidak diubah, null/'' = hapus, data URL = ganti.
  if ((jenis === 'MATERI' || jenis === 'TUGAS') && payload.lampiran !== undefined) {
    values.lampiran = payload.lampiran || null;
    values.lampiranNama = payload.lampiran ? payload.lampiranNama || 'lampiran' : null;
  }

  return sequelize.transaction(async (transaction) => {
    const konten = lama ? await lama.update(values, { transaction }) : await ElearningKonten.create(values, { transaction });
    await ElearningKontenMahasiswa.destroy({ where: { kontenId: konten.id }, transaction });
    if (penerima.length) await ElearningKontenMahasiswa.bulkCreate(penerima.map((p) => ({ ...p, kontenId: konten.id })), { transaction });
    if (soal) {
      await ElearningSoal.destroy({ where: { kontenId: konten.id }, transaction });
      await ElearningSoal.bulkCreate(soal.map((s) => ({ ...s, kontenId: konten.id })), { transaction });
    }
    return { id: konten.id };
  });
};

const deleteKonten = async (dosenId, kontenId) => {
  const konten = await findKontenDosen(dosenId, kontenId);
  await konten.destroy(); // penerima, soal & jawaban ikut terhapus (FK CASCADE)
};

/** Daftar tujuan untuk hasil kuis / pengumpulan tugas (KAMPUS: peserta kelas + pengirim dari luar kelas). */
const tujuanKonten = async (konten, peserta, mahasiswaIdPengirim) => {
  if (konten.target === 'SEMUA') return peserta;
  if (BERDAFTAR.includes(konten.target)) {
    // GRUP: setiap tujuan membawa nama grupnya, diurutkan per grup.
    const rows = await ElearningKontenMahasiswa.findAll({ where: { kontenId: konten.id }, attributes: ['mahasiswaId', 'grupKe', 'grupNama'], raw: true });
    const grupOf = new Map(rows.map((x) => [x.mahasiswaId, x]));
    const hasil = peserta.filter((p) => grupOf.has(p.id));
    if (konten.target !== 'GRUP') return hasil;
    return hasil
      .map((p) => ({ ...p, grup: grupOf.get(p.id).grupNama || `Grup ${grupOf.get(p.id).grupKe}` }))
      .sort((a, b) => grupOf.get(a.id).grupKe - grupOf.get(b.id).grupKe);
  }
  const ada = new Set(peserta.map((p) => p.id));
  const luar = mahasiswaIdPengirim.filter((id) => !ada.has(id));
  const tambahan = luar.length ? await q('SELECT id, nim, nama_lengkap AS nama FROM mahasiswa WHERE id IN (:ids) ORDER BY nim', { ids: luar }) : [];
  return [...peserta, ...tambahan];
};

/** Pengumpulan tugas: setiap tujuan + status kumpul, terlambat, nilai & catatan (tanpa isi file). */
const pengumpulanTugas = async (dosenId, kontenId) => {
  const konten = await findKontenDosen(dosenId, kontenId);
  if (konten.jenis !== 'TUGAS') throw new ApiError(400, 'Konten ini bukan tugas');
  const [peserta, jawaban] = await Promise.all([
    pesertaKelas(konten.jadwalKuliahId),
    ElearningTugasJawaban.findAll({ where: { kontenId: konten.id }, attributes: { exclude: ['lampiran'] } }),
  ]);
  const tujuan = await tujuanKonten(konten, peserta, jawaban.map((j) => j.mahasiswaId));
  const jawabanOf = new Map(jawaban.map((j) => [j.mahasiswaId, j]));
  const namaOf = new Map(tujuan.map((p) => [p.id, p.nama]));
  const durasiOf = await durasiKonten(konten.id);
  const rows = tujuan.map((p) => {
    const j = jawabanOf.get(p.id);
    return {
      ...p,
      jawabanId: j?.id ?? null,
      dikumpulkan: j?.updatedAt ?? null,
      dikumpulkanOleh: j?.dikumpulkanOleh && j.dikumpulkanOleh !== p.id ? namaOf.get(j.dikumpulkanOleh) ?? null : null,
      durasi: durasiOf.get(p.id) ?? 0,
      terlambat: !!j?.terlambat,
      isi: j?.isi ?? null,
      lampiranNama: j?.lampiranNama ?? null,
      nilai: j?.nilai ?? null,
      catatan: j?.catatan ?? null,
      dinilaiAt: j?.dinilaiAt ?? null,
    };
  });
  const kumpul = rows.filter((r) => r.jawabanId);
  const dinilai = kumpul.filter((r) => r.nilai !== null);
  return {
    konten: ringkasKonten(konten),
    rows,
    ringkasan: {
      penerima: konten.target === 'KAMPUS' ? await jumlahMahasiswaKampus() : rows.length,
      dikumpulkan: kumpul.length,
      terlambat: kumpul.filter((r) => r.terlambat).length,
      dinilai: dinilai.length,
      rataNilai: dinilai.length ? round2(dinilai.reduce((s, r) => s + r.nilai, 0) / dinilai.length) : null,
    },
  };
};

/** File jawaban tugas (untuk diunduh dosen). */
const lampiranJawabanTugas = async (dosenId, jawabanId) => {
  const j = await ElearningTugasJawaban.findByPk(jawabanId, { attributes: ['id', 'kontenId', 'lampiran', 'lampiranNama'] });
  if (!j) throw new ApiError(404, 'Jawaban tidak ditemukan');
  await findKontenDosen(dosenId, j.kontenId);
  return { lampiran: j.lampiran, lampiranNama: j.lampiranNama };
};

/** Beri / ubah nilai (0–100) & catatan pada jawaban tugas. */
const nilaiTugas = async (dosenId, jawabanId, { nilai, catatan }) => {
  const j = await ElearningTugasJawaban.findByPk(jawabanId, { attributes: { exclude: ['lampiran'] } });
  if (!j) throw new ApiError(404, 'Jawaban tidak ditemukan');
  const konten = await findKontenDosen(dosenId, j.kontenId);
  const angka = Number(nilai);
  if (!Number.isFinite(angka) || angka < 0 || angka > 100) throw new ApiError(400, 'Nilai harus 0–100');
  const values = { nilai: round2(angka), catatan: String(catatan ?? '').trim() || null, dinilaiAt: new Date() };
  const anggota = await anggotaSegrup(konten, j.mahasiswaId);
  await ElearningTugasJawaban.update(values, { where: { kontenId: j.kontenId, mahasiswaId: anggota } });
  return { nilai: values.nilai, jumlahAnggota: anggota.length };
};

/** Hasil kuis: setiap penerima + skor / status pengerjaan. */
/** Reset kuis satu mahasiswa (panic button dosen): hapus jawaban & draf → mahasiswa bisa mengerjakan ulang. */
const resetKuisMahasiswa = async (dosenId, kontenId, mahasiswaId) => {
  const konten = await findKontenDosen(dosenId, kontenId);
  if (konten.jenis !== 'KUIS') throw new ApiError(400, 'Konten ini bukan kuis');
  const where = { kontenId: konten.id, mahasiswaId: Number(mahasiswaId) };
  const dihapus = await sequelize.transaction(async (transaction) => {
    const n = await ElearningJawaban.destroy({ where, transaction });
    await sequelize.query('DELETE FROM elearning_kuis_draf WHERE konten_id = :k AND mahasiswa_id = :m', { replacements: { k: konten.id, m: where.mahasiswaId }, transaction });
    return n;
  });
  if (!dihapus) throw new ApiError(404, 'Mahasiswa ini belum mengerjakan kuis');
  return { direset: true };
};

const hasilKuis = async (dosenId, kontenId) => {
  const konten = await findKontenDosen(dosenId, kontenId);
  if (konten.jenis !== 'KUIS') throw new ApiError(400, 'Konten ini bukan kuis');
  const [peserta, jawaban, jumlahSoal] = await Promise.all([
    pesertaKelas(konten.jadwalKuliahId),
    ElearningJawaban.findAll({ where: { kontenId: konten.id } }),
    ElearningSoal.count({ where: { kontenId: konten.id } }),
  ]);
  const tujuan = await tujuanKonten(konten, peserta, jawaban.map((j) => j.mahasiswaId));
  const jawabanOf = new Map(jawaban.map((j) => [j.mahasiswaId, j]));
  const durasiOf = await durasiKonten(konten.id);
  const rows = tujuan.map((p) => {
    const j = jawabanOf.get(p.id);
    return { ...p, sudah: !!j, benar: j?.benar ?? null, skor: j ? j.skor : null, dikirim: j?.createdAt ?? null, durasi: durasiOf.get(p.id) ?? 0 };
  });
  const dinilai = rows.filter((r) => r.sudah);
  return {
    konten: ringkasKonten(konten, { jumlahSoal }),
    rows,
    ringkasan: {
      penerima: rows.length,
      sudah: dinilai.length,
      rataSkor: dinilai.length ? round2(dinilai.reduce((s, r) => s + r.skor, 0) / dinilai.length) : null,
    },
  };
};

// ---------------------------------------------------------------- Mahasiswa

/**
 * Konten terbit yang boleh diakses mahasiswa: di dalam periode tayang, dan (target KAMPUS & mahasiswa aktif) atau
 * (mengikuti kelasnya & target SEMUA / PILIHAN yang memuat dirinya).
 */
const kontenUntukMahasiswa = (mahasiswaId, kontenId = null) =>
  q(
    `SELECT c.id, c.jadwal_kuliah_id AS jadwalKuliahId, c.jenis, c.target, c.judul, c.deskripsi, c.url, c.lampiran_nama AS lampiranNama,
            c.video_urls AS videoUrls, ${sqlSampul('c', 'thumb')} AS sampul, ${sqlSampul('c', 'id')} AS sampulId,
            c.kategori, c.tagline, c.is_wajib AS isWajib, c.prasyarat_id AS prasyaratId, c.pertemuan_ke AS pertemuanKe, c.tenggat, c.tersedia_sampai AS tersediaSampai, c.created_at AS createdAt,
            c.durasi_menit AS durasiMenit, c.tampilkan_hasil AS tampilkanHasil, c.acak_soal AS acakSoal,
            j.kelas, j.kode_mata_kuliah AS kodeMataKuliah, j.nama_mata_kuliah AS namaMataKuliah,
            CONCAT_WS(', ', NULLIF(d.nama_lengkap, ''), NULLIF(d.gelar, '')) AS dosen,
            a.skor, a.benar, a.jumlah_soal AS jumlahSoal, a.created_at AS dikerjakan, pg.created_at AS ditandaiSelesai,
            tj.updated_at AS dikumpulkan, tj.terlambat, tj.nilai AS nilaiTugas, tj.catatan AS catatanTugas,
            dr.updated_at AS drafDisimpan, dr.jawaban AS drafJawaban, dr.mulai_at AS mulaiAt
       FROM elearning_konten c
       JOIN jadwal_kuliah j ON j.id = c.jadwal_kuliah_id
       LEFT JOIN dosen d ON d.id = c.dosen_id
       LEFT JOIN elearning_jawaban a ON a.konten_id = c.id AND a.mahasiswa_id = :mhs
       LEFT JOIN elearning_progres pg ON pg.konten_id = c.id AND pg.mahasiswa_id = :mhs
       LEFT JOIN elearning_tugas_jawaban tj ON tj.konten_id = c.id AND tj.mahasiswa_id = :mhs
       LEFT JOIN elearning_kuis_draf dr ON dr.konten_id = c.id AND dr.mahasiswa_id = :mhs
      WHERE c.is_published = 1
        AND (c.tersedia_mulai IS NULL OR c.tersedia_mulai <= NOW())
        AND (c.tersedia_sampai IS NULL OR c.tersedia_sampai >= NOW())
        ${kontenId ? 'AND c.id = :kontenId' : ''}
        AND (
          (c.target = 'KAMPUS' AND EXISTS (SELECT 1 FROM mahasiswa mm WHERE mm.id = :mhs AND mm.is_active = 1 AND mm.status_keluar IS NULL))
          OR (
            EXISTS (SELECT 1 FROM krs_detail kd JOIN krs k ON k.id = kd.krs_id AND k.status = 'DISETUJUI'
                     WHERE kd.jadwal_kuliah_id = c.jadwal_kuliah_id AND k.mahasiswa_id = :mhs)
            AND (c.target = 'SEMUA' OR (c.target IN ('PILIHAN', 'GRUP') AND EXISTS (SELECT 1 FROM elearning_konten_mahasiswa p WHERE p.konten_id = c.id AND p.mahasiswa_id = :mhs)))
          )
        )
      ORDER BY c.created_at DESC`,
    { mhs: mahasiswaId, kontenId }
  );

const hasilTampil = (r) => r.tampilkanHasil === undefined || r.tampilkanHasil === null || !!Number(r.tampilkanHasil);
/** Batas akhir pengerjaan kuis: yang lebih dulu antara tenggat & (mulai + durasi). null = tanpa batas / belum mulai. */
const batasAkhirKuis = (r) => {
  const batas = [r.tenggat ? new Date(r.tenggat) : null, r.durasiMenit && r.mulaiAt ? new Date(new Date(r.mulaiAt).getTime() + Number(r.durasiMenit) * 60000) : null].filter(Boolean);
  return batas.length ? new Date(Math.min(...batas.map((d) => d.getTime()))) : null;
};
// Toleransi keterlambatan kirim (jaringan) setelah durasi habis.
const TOLERANSI_KIRIM_MS = 2 * 60 * 1000;
const acak = (list) => {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const bentukMhs = (r) => ({
  id: r.id,
  jadwalKuliahId: r.jadwalKuliahId,
  jenis: r.jenis,
  judul: r.judul,
  kategori: r.kategori,
  tagline: parseTagline(r.tagline),
  isWajib: !!Number(r.isWajib),
  deskripsi: r.deskripsi,
  url: r.url,
  lampiranNama: r.lampiranNama,
  videoUrls: (() => {
    try {
      const v = JSON.parse(r.videoUrls || '[]');
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  })(),
  sampul: r.sampul ?? null,
  sampulId: r.sampulId ? Number(r.sampulId) : null,
  pertemuanKe: r.pertemuanKe,
  tenggat: r.tenggat,
  tersediaSampai: r.tersediaSampai ?? null,
  createdAt: r.createdAt,
  kelas: { kelas: r.kelas, kodeMataKuliah: r.kodeMataKuliah, namaMataKuliah: r.namaMataKuliah, dosen: r.dosen },
  // Kuis: nilai disembunyikan (null) bila dosen memilih tidak menampilkan hasil ke mahasiswa.
  hasil: r.dikerjakan
    ? hasilTampil(r)
      ? { skor: Number(r.skor), benar: Number(r.benar), jumlahSoal: Number(r.jumlahSoal), dikerjakan: r.dikerjakan }
      : { skor: null, benar: null, jumlahSoal: Number(r.jumlahSoal), dikerjakan: r.dikerjakan }
    : null,
  durasiMenit: r.durasiMenit ? Number(r.durasiMenit) : null,
  tampilkanHasil: hasilTampil(r),
  mulaiAt: r.mulaiAt ?? null,
  batasAkhir: r.jenis === 'KUIS' && !r.dikerjakan ? batasAkhirKuis(r) : null,
  // Tugas: status pengumpulan & nilai dosen.
  // Kuis: draf pengerjaan yang belum dikirim (jumlah soal terjawab).
  draf: r.drafDisimpan && !r.dikerjakan ? { disimpan: r.drafDisimpan, terjawab: hitungTerjawab(r.drafJawaban) } : null,
  pengumpulan: r.dikumpulkan
    ? { dikumpulkan: r.dikumpulkan, terlambat: !!Number(r.terlambat), nilai: r.nilaiTugas === null ? null : Number(r.nilaiTugas), catatan: r.catatanTugas ?? null }
    : null,
  selesai: r.selesai,
  prasyarat: r.prasyarat,
  terkunci: r.terkunci,
});

/** Kuis selesai = sudah dikerjakan; tugas = sudah dikumpulkan; materi / video = ditandai selesai (dipelajari / ditonton). */
const sudahSelesai = (r) => (r.jenis === 'KUIS' ? !!r.dikerjakan : r.jenis === 'TUGAS' ? !!r.dikumpulkan : !!r.ditandaiSelesai);
const AKSI_SELESAI = { KUIS: 'mengerjakan kuis', TUGAS: 'mengumpulkan tugas', VIDEO: 'menonton video', MATERI: 'mempelajari materi' };

/**
 * Konten mahasiswa + status selesai & terkunci. Terkunci bila prasyaratnya (yang juga ditujukan ke mahasiswa ini &
 * sudah terbit) belum diselesaikan; prasyarat yang tidak bisa diakses mahasiswa diabaikan.
 */
const kontenDenganStatus = async (mahasiswaId) => {
  const rows = await kontenUntukMahasiswa(mahasiswaId);
  const byId = new Map(rows.map((r) => [r.id, r]));
  return rows.map((r) => {
    const syarat = r.prasyaratId ? byId.get(r.prasyaratId) : null;
    return {
      ...r,
      selesai: sudahSelesai(r),
      prasyarat: syarat ? { id: syarat.id, judul: syarat.judul, jenis: syarat.jenis, selesai: sudahSelesai(syarat) } : null,
      terkunci: !!syarat && !sudahSelesai(syarat),
    };
  });
};
const kontenTerbuka = async (mahasiswaId, kontenId, label = 'Konten') => {
  const r = (await kontenDenganStatus(mahasiswaId)).find((x) => x.id === Number(kontenId));
  if (!r) throw new ApiError(404, `${label} tidak ditemukan atau tidak ditujukan untuk Anda`);
  if (r.terkunci) {
    const aksi = AKSI_SELESAI[r.prasyarat.jenis] ?? 'menyelesaikan';
    throw new ApiError(403, `Konten ini terkunci. Selesaikan dulu dengan ${aksi} "${r.prasyarat.judul}".`);
  }
  return r;
};

/** Daftar konten mahasiswa + nama dosen penerbit, jumlah dilihat & interaksi timeline (suka / komentar). */
const listKontenMahasiswa = async (mahasiswaId) => {
  const rows = await kontenDenganStatus(mahasiswaId);
  const ids = rows.map((r) => r.id);
  const [lihat, interaksi] = await Promise.all([statLihat(ids), statInteraksiMahasiswa(ids, mahasiswaId)]);
  return rows.map((r) => ({
    ...bentukMhs(r),
    namaDosen: r.dosen ?? null,
    dilihat: lihat.get(r.id) ?? LIHAT_KOSONG,
    interaksi: interaksi.get(r.id) ?? { suka: 0, disukai: false, komentar: 0 },
  }));
};

// ---------------------------------------------------------------- Interaksi timeline mahasiswa (suka & komentar)

/** Jumlah suka, apakah disukai mahasiswa ini, dan jumlah komentar per konten. */
const statInteraksiMahasiswa = async (ids, mahasiswaId) => {
  if (!ids.length) return new Map();
  const [suka, komentar] = await Promise.all([
    q('SELECT konten_id AS id, COUNT(*) AS n, SUM(mahasiswa_id = :mhs) AS saya FROM elearning_suka WHERE konten_id IN (:ids) GROUP BY konten_id', { ids, mhs: mahasiswaId }),
    q('SELECT konten_id AS id, COUNT(*) AS n FROM elearning_komentar WHERE konten_id IN (:ids) GROUP BY konten_id', { ids }),
  ]);
  return new Map(
    ids.map((id) => {
      const s = suka.find((r) => Number(r.id) === id);
      return [id, { suka: Number(s?.n ?? 0), disukai: Number(s?.saya ?? 0) > 0, komentar: Number(komentar.find((r) => Number(r.id) === id)?.n ?? 0) }];
    })
  );
};

/** Konten yang ditujukan ke mahasiswa (boleh terkunci prasyarat — suka & komentar tetap boleh). */
const kontenTerlihat = async (mahasiswaId, kontenId) => {
  const [r] = await kontenUntukMahasiswa(mahasiswaId, Number(kontenId));
  if (!r) throw new ApiError(404, 'Konten tidak ditemukan atau tidak ditujukan untuk Anda');
  return r;
};

const toggleSukaMahasiswa = async (mahasiswaId, kontenId) => {
  const konten = await kontenTerlihat(mahasiswaId, kontenId);
  const [ada] = await q('SELECT id FROM elearning_suka WHERE konten_id = :k AND mahasiswa_id = :m LIMIT 1', { k: konten.id, m: mahasiswaId });
  if (ada) await sequelize.query('DELETE FROM elearning_suka WHERE id = :id', { replacements: { id: ada.id } });
  else
    await sequelize.query('INSERT INTO elearning_suka (konten_id, mahasiswa_id, created_at, updated_at) VALUES (:k, :m, NOW(), NOW())', {
      replacements: { k: konten.id, m: mahasiswaId },
    });
  const [r] = await q('SELECT COUNT(*) AS n FROM elearning_suka WHERE konten_id = :k', { k: konten.id });
  return { disukai: !ada, suka: Number(r.n) };
};

/** Komentar konten (sama dengan dosen); `milikSaya` = komentar mahasiswa ini (hanya itu yang boleh dihapusnya). */
const listKomentarMahasiswa = async (mahasiswaId, kontenId) => {
  const konten = await kontenTerlihat(mahasiswaId, kontenId);
  const rows = await q(
    `SELECT c.id, c.isi, c.created_at AS createdAt, c.dosen_id AS dosenId, c.mahasiswa_id AS mahasiswaId,
            COALESCE(CONCAT_WS(', ', NULLIF(d.nama_lengkap, ''), NULLIF(d.gelar, '')), m.nama_lengkap) AS nama
       FROM elearning_komentar c
       LEFT JOIN dosen d ON d.id = c.dosen_id
       LEFT JOIN mahasiswa m ON m.id = c.mahasiswa_id
      WHERE c.konten_id = :k ORDER BY c.created_at ASC, c.id ASC`,
    { k: konten.id }
  );
  return rows.map((r) => ({
    id: r.id,
    isi: r.isi,
    createdAt: r.createdAt,
    nama: r.nama ?? '-',
    peran: r.dosenId ? 'DOSEN' : 'MAHASISWA',
    milikSaya: Number(r.mahasiswaId) === Number(mahasiswaId),
  }));
};

const tambahKomentarMahasiswa = async (mahasiswaId, kontenId, isi) => {
  const konten = await kontenTerlihat(mahasiswaId, kontenId);
  const teksBersih = String(isi ?? '').trim();
  if (!teksBersih) throw new ApiError(400, 'Komentar tidak boleh kosong');
  await sequelize.query('INSERT INTO elearning_komentar (konten_id, mahasiswa_id, isi, created_at, updated_at) VALUES (:k, :m, :isi, NOW(), NOW())', {
    replacements: { k: konten.id, m: mahasiswaId, isi: teksBersih.slice(0, 2000) },
  });
  return listKomentarMahasiswa(mahasiswaId, konten.id);
};

/** Mahasiswa hanya boleh menghapus komentarnya sendiri. */
const hapusKomentarMahasiswa = async (mahasiswaId, komentarId) => {
  const [k] = await q('SELECT id, mahasiswa_id AS mahasiswaId FROM elearning_komentar WHERE id = :id', { id: komentarId });
  if (!k) throw new ApiError(404, 'Komentar tidak ditemukan');
  if (Number(k.mahasiswaId) !== Number(mahasiswaId)) throw new ApiError(403, 'Anda hanya bisa menghapus komentar Anda sendiri');
  await sequelize.query('DELETE FROM elearning_komentar WHERE id = :id', { replacements: { id: k.id } });
};

/**
 * Learning History mahasiswa: konten e-learning kelas-kelas KRS disetujui pada semester lampau (tahun ajaran
 * tidak aktif; `semuaPeriode` = termasuk semester berjalan), tanpa batas periode tayang — dikelompokkan per periode
 * → mata kuliah, beserta status belajar (selesai / dibuka / belum), skor kuis, nilai tugas & ringkasan.
 */
const riwayatBelajar = async (mahasiswaId, { semuaPeriode = false } = {}) => {
  const rows = await q(
    `SELECT c.id, c.jenis, c.judul, c.pertemuan_ke AS pertemuanKe, c.is_wajib AS isWajib, c.created_at AS createdAt,
            j.id AS jadwalKuliahId, j.kelas, j.kode_mata_kuliah AS kodeMataKuliah, j.nama_mata_kuliah AS namaMataKuliah, j.sks,
            (SELECT mk.ikon FROM mata_kuliah mk WHERE mk.id = j.mata_kuliah_id) AS ikon,
            t.id AS tahunAjaranId, t.nama AS tahun, t.jenis_semester AS jenisSemester, t.tahun_mulai AS tahunMulai, t.is_active AS aktif,
            CONCAT_WS(', ', NULLIF(d.nama_lengkap, ''), NULLIF(d.gelar, '')) AS dosen,
            pg.created_at AS ditandaiSelesai, IF(c.tampilkan_hasil = 1, a.skor, NULL) AS skor, a.created_at AS dikerjakan,
            tj.updated_at AS dikumpulkan, tj.nilai AS nilaiTugas, tj.terlambat,
            l.jumlah AS dilihat, l.updated_at AS terakhirDilihat
       FROM elearning_konten c
       JOIN jadwal_kuliah j ON j.id = c.jadwal_kuliah_id
       JOIN tahun_ajaran t ON t.id = j.tahun_ajaran_id
       JOIN krs_detail kd ON kd.jadwal_kuliah_id = j.id
       JOIN krs k ON k.id = kd.krs_id AND k.status = 'DISETUJUI' AND k.mahasiswa_id = :mhs
       LEFT JOIN dosen d ON d.id = c.dosen_id
       LEFT JOIN elearning_progres pg ON pg.konten_id = c.id AND pg.mahasiswa_id = :mhs
       LEFT JOIN elearning_jawaban a ON a.konten_id = c.id AND a.mahasiswa_id = :mhs
       LEFT JOIN elearning_tugas_jawaban tj ON tj.konten_id = c.id AND tj.mahasiswa_id = :mhs
       LEFT JOIN elearning_lihat l ON l.konten_id = c.id AND l.mahasiswa_id = :mhs
      WHERE c.is_published = 1
        AND (c.target NOT IN ('PILIHAN', 'GRUP') OR EXISTS (SELECT 1 FROM elearning_konten_mahasiswa p WHERE p.konten_id = c.id AND p.mahasiswa_id = :mhs))
        ${semuaPeriode ? '' : 'AND t.is_active = 0'}
      ORDER BY t.tahun_mulai DESC, t.jenis_semester DESC, j.nama_mata_kuliah, j.kelas, c.pertemuan_ke IS NULL, c.pertemuan_ke, c.created_at`,
    { mhs: mahasiswaId }
  );
  const bulat = (v) => Math.round(v * 100) / 100;
  const rata = (list) => (list.length ? bulat(list.reduce((s, v) => s + v, 0) / list.length) : null);
  const item = (r) => {
    const selesaiPada = r.jenis === 'KUIS' ? r.dikerjakan : r.jenis === 'TUGAS' ? r.dikumpulkan : r.ditandaiSelesai;
    return {
      id: r.id,
      jenis: r.jenis,
      judul: r.judul,
      pertemuanKe: r.pertemuanKe,
      isWajib: !!Number(r.isWajib),
      dosen: r.dosen,
      status: selesaiPada ? 'SELESAI' : Number(r.dilihat ?? 0) > 0 ? 'DIBUKA' : 'BELUM',
      selesaiPada: selesaiPada ?? null,
      skor: r.skor === null || r.skor === undefined ? null : Number(r.skor),
      nilaiTugas: r.nilaiTugas === null || r.nilaiTugas === undefined ? null : Number(r.nilaiTugas),
      terlambat: !!Number(r.terlambat ?? 0),
      dilihat: Number(r.dilihat ?? 0),
      terakhirDilihat: r.terakhirDilihat ?? null,
    };
  };
  const ringkas = (list) => ({
    jumlah: list.length,
    selesai: list.filter((x) => x.status === 'SELESAI').length,
    rataKuis: rata(list.map((x) => x.skor).filter((v) => v !== null)),
    rataTugas: rata(list.map((x) => x.nilaiTugas).filter((v) => v !== null)),
  });

  const periode = [];
  rows.forEach((r) => {
    let p = periode.find((x) => x.id === Number(r.tahunAjaranId));
    if (!p) {
      p = { id: Number(r.tahunAjaranId), nama: formatTahunAjaran({ nama: r.tahun, jenisSemester: r.jenisSemester }), aktif: !!Number(r.aktif), kelas: [] };
      periode.push(p);
    }
    let kls = p.kelas.find((x) => x.jadwalKuliahId === Number(r.jadwalKuliahId));
    if (!kls) {
      kls = { jadwalKuliahId: Number(r.jadwalKuliahId), kelas: r.kelas, kodeMataKuliah: r.kodeMataKuliah, namaMataKuliah: r.namaMataKuliah, ikon: r.ikon ?? null, sks: r.sks, konten: [] };
      p.kelas.push(kls);
    }
    kls.konten.push(item(r));
  });
  periode.forEach((p) => {
    p.kelas.forEach((k) => (k.ringkasan = ringkas(k.konten)));
    p.ringkasan = ringkas(p.kelas.flatMap((k) => k.konten));
  });
  return { ringkasan: ringkas(periode.flatMap((p) => p.kelas.flatMap((k) => k.konten))), periode };
};

/**
 * My Class mahasiswa: kelas dari KRS yang disetujui pada tahun ajaran aktif, beserta dosen koordinator & jumlah
 * konten e-learning yang ditujukan ke mahasiswa ini per kelas.
 */
/**
 * My Team: konten bertarget GRUP yang memuat mahasiswa ini, beserta grupnya & anggota satu grup
 * (untuk tugas: siapa saja yang sudah mengumpulkan).
 */
const timMahasiswa = async (mahasiswaId) => {
  const rows = (await kontenDenganStatus(mahasiswaId)).filter((r) => r.target === 'GRUP');
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const [saya, anggota, ikon] = await Promise.all([
    q('SELECT konten_id AS kontenId, grup_ke AS grupKe, grup_nama AS grupNama FROM elearning_konten_mahasiswa WHERE mahasiswa_id = :mhs AND konten_id IN (:ids)', { mhs: mahasiswaId, ids }),
    q(
      `SELECT p.konten_id AS kontenId, p.grup_ke AS grupKe, m.id, m.nim, m.nama_lengkap AS nama, tj.updated_at AS dikumpulkan,
              (tj.dikumpulkan_oleh = m.id) AS pengunggah
         FROM elearning_konten_mahasiswa p
         JOIN mahasiswa m ON m.id = p.mahasiswa_id
         LEFT JOIN elearning_tugas_jawaban tj ON tj.konten_id = p.konten_id AND tj.mahasiswa_id = p.mahasiswa_id
        WHERE p.konten_id IN (:ids)
        ORDER BY m.nim`,
      { ids }
    ),
    q('SELECT j.id, mk.ikon FROM jadwal_kuliah j LEFT JOIN mata_kuliah mk ON mk.id = j.mata_kuliah_id WHERE j.id IN (:jids)', { jids: [...new Set(rows.map((r) => r.jadwalKuliahId))] }),
  ]);
  const grupOf = new Map(saya.map((s) => [s.kontenId, s]));
  const ikonOf = new Map(ikon.map((x) => [x.id, x.ikon ?? null]));
  return rows.map((r) => {
    const g = grupOf.get(r.id);
    return {
      ...bentukMhs(r),
      ikon: ikonOf.get(r.jadwalKuliahId) ?? null,
      grup: {
        nama: g?.grupNama || `Grup ${g?.grupKe ?? ''}`.trim(),
        anggota: anggota
          .filter((a) => a.kontenId === r.id && a.grupKe === g?.grupKe)
          .map((a) => ({ nim: a.nim, nama: a.nama, saya: a.id === mahasiswaId, dikumpulkan: a.dikumpulkan ?? null, pengunggah: !!Number(a.pengunggah) })),
      },
    };
  });
};

const kelasMahasiswa = async (mahasiswaId) => {
  const kelas = await q(
    `SELECT j.id, j.kelas, j.kode_mata_kuliah AS kodeMataKuliah, j.nama_mata_kuliah AS namaMataKuliah, j.sks, j.semester,
            (SELECT mk.ikon FROM mata_kuliah mk WHERE mk.id = j.mata_kuliah_id) AS ikon,
            CONCAT_WS(', ', NULLIF(d.nama_lengkap, ''), NULLIF(d.gelar, '')) AS dosen, t.nama AS tahun, t.jenis_semester AS jenisSemester
       FROM krs k
       JOIN tahun_ajaran t ON t.id = k.tahun_ajaran_id AND t.is_active = 1
       JOIN krs_detail kd ON kd.krs_id = k.id
       JOIN jadwal_kuliah j ON j.id = kd.jadwal_kuliah_id
       LEFT JOIN dosen d ON d.id = j.dosen_kordinator_id
      WHERE k.mahasiswa_id = :mhs AND k.status = 'DISETUJUI'
      ORDER BY j.nama_mata_kuliah, j.kelas`,
    { mhs: mahasiswaId }
  );
  const konten = await kontenDenganStatus(mahasiswaId);
  return kelas.map((j) => {
    const milik = konten.filter((c) => c.jadwalKuliahId === Number(j.id));
    return {
      id: Number(j.id),
      kelas: j.kelas,
      kodeMataKuliah: j.kodeMataKuliah,
      namaMataKuliah: j.namaMataKuliah,
      ikon: j.ikon ?? null,
      sks: j.sks,
      semester: j.semester,
      dosen: j.dosen,
      tahunAjaran: formatTahunAjaran({ nama: j.tahun, jenisSemester: j.jenisSemester }),
      jumlah: milik.length,
      selesai: milik.filter((c) => c.selesai).length,
    };
  });
};

/** Tandai materi / video sudah dipelajari / ditonton (membuka konten yang mensyaratkannya). */
const tandaiSelesai = async (mahasiswaId, kontenId) => {
  const r = await kontenTerbuka(mahasiswaId, kontenId);
  if (r.jenis === 'KUIS') throw new ApiError(400, 'Kuis dianggap selesai setelah jawaban dikirim');
  if (r.jenis === 'TUGAS') throw new ApiError(400, 'Tugas dianggap selesai setelah dikumpulkan');
  if (!r.ditandaiSelesai) await ElearningProgres.create({ kontenId: r.id, mahasiswaId });
  return { selesai: true };
};

/**
 * Tambah durasi aktif mahasiswa pada konten (ping berkala halaman detail; maks 5 menit per ping).
 * Hanya konten yang sudah pernah dibuka (baris elearning_lihat dibuat saat detail dibuka).
 */
const tambahDurasi = async (mahasiswaId, kontenId, detik) => {
  const d = Math.max(0, Math.min(300, Math.round(Number(detik) || 0)));
  if (!d) return { durasi: null };
  const [, meta] = await sequelize.query('UPDATE elearning_lihat SET durasi_detik = durasi_detik + :d WHERE konten_id = :k AND mahasiswa_id = :m', {
    replacements: { d, k: Number(kontenId), m: mahasiswaId },
  });
  if (!(meta?.affectedRows ?? meta)) throw new ApiError(404, 'Konten belum dibuka');
  return { ditambah: d };
};

/** Detail konten mahasiswa: isi & lampiran materi, soal kuis (kunci hanya tampil setelah mengerjakan). */
const getKontenMahasiswa = async (mahasiswaId, kontenId) => {
  const r = await kontenTerbuka(mahasiswaId, kontenId);
  // Hitung dilihat: setiap kali mahasiswa membuka konten (satu baris per konten × mahasiswa).
  await sequelize.query(
    'INSERT INTO elearning_lihat (konten_id, mahasiswa_id, jumlah, created_at, updated_at) VALUES (:k, :m, 1, NOW(), NOW()) ON DUPLICATE KEY UPDATE jumlah = jumlah + 1, updated_at = NOW()',
    { replacements: { k: r.id, m: mahasiswaId } }
  );
  const konten = await ElearningKonten.findByPk(r.id, { attributes: ['id', 'isi', 'lampiran', 'target', 'videoUrls'] });
  const data = { ...bentukMhs(r), isi: konten.isi, lampiran: konten.lampiran, videoUrls: konten.videoUrls, ...(await daftarBerkas(r.id)) };
  if (konten.target === 'GRUP') {
    const saya = await ElearningKontenMahasiswa.findOne({ where: { kontenId: r.id, mahasiswaId }, attributes: ['grupKe', 'grupNama'], raw: true });
    const anggota = saya
      ? await q(
          `SELECT m.nim, m.nama_lengkap AS nama FROM elearning_konten_mahasiswa p JOIN mahasiswa m ON m.id = p.mahasiswa_id
            WHERE p.konten_id = :k AND p.grup_ke = :g ORDER BY m.nim`,
          { k: r.id, g: saya.grupKe }
        )
      : [];
    data.grup = saya ? { nama: saya.grupNama || `Grup ${saya.grupKe}`, anggota } : null;
  }
  if (r.jenis === 'KUIS') {
    const [soal, jawaban] = await Promise.all([
      ElearningSoal.findAll({ where: { kontenId: r.id }, order: [['urutan', 'ASC'], ['id', 'ASC']] }),
      ElearningJawaban.findOne({ where: { kontenId: r.id, mahasiswaId } }),
    ]);
    const tampil = hasilTampil(r);
    // Kuis berdurasi: soal baru dikirim setelah mahasiswa menekan "Mulai" (waktu mulai tercatat).
    data.perluMulai = !jawaban && !!r.durasiMenit && !r.mulaiAt;
    const urut = !jawaban && r.acakSoal && Number(r.acakSoal) ? acak(soal) : soal;
    data.soal = data.perluMulai
      ? []
      : urut.map((s) => ({
          id: s.id,
          pertanyaan: s.pertanyaan,
          pilihan: s.pilihan,
          ...(jawaban && tampil ? { jawabanBenar: s.jawabanBenar, jawabanAnda: jawaban.jawaban[s.id] ?? null } : {}),
        }));
    data.jumlahSoal = soal.length;
  }
  if (r.jenis === 'KUIS' && !r.dikerjakan && r.drafJawaban) {
    try {
      data.drafJawaban = JSON.parse(r.drafJawaban);
    } catch {
      data.drafJawaban = null;
    }
  }
  if (r.jenis === 'TUGAS') {
    const tj = await ElearningTugasJawaban.findOne({ where: { kontenId: r.id, mahasiswaId } });
    data.jawabanTugas = tj
      ? {
          isi: tj.isi,
          lampiran: tj.lampiran,
          lampiranNama: tj.lampiranNama,
          terlambat: tj.terlambat,
          nilai: tj.nilai,
          catatan: tj.catatan,
          dikumpulkan: tj.updatedAt,
          dinilaiAt: tj.dinilaiAt,
          // Tugas grup: nama anggota yang mengunggah (null = diri sendiri).
          dikumpulkanOleh:
            tj.dikumpulkanOleh && tj.dikumpulkanOleh !== mahasiswaId
              ? ((await q('SELECT nama_lengkap AS nama FROM mahasiswa WHERE id = :id', { id: tj.dikumpulkanOleh }))[0]?.nama ?? null)
              : null,
        }
      : null;
  }
  return data;
};

/**
 * Kumpulkan / perbarui jawaban tugas (teks dan/atau file). Setelah tenggat tetap diterima tetapi ditandai terlambat;
 * tidak bisa diubah lagi setelah dinilai dosen.
 */
/** Mahasiswa satu grup dengan mahasiswaId pada konten bertarget GRUP (selain GRUP: dirinya sendiri). */
const anggotaSegrup = async (konten, mahasiswaId) => {
  if (konten.target !== 'GRUP') return [mahasiswaId];
  const rows = await q(
    `SELECT p2.mahasiswa_id AS id FROM elearning_konten_mahasiswa p1
       JOIN elearning_konten_mahasiswa p2 ON p2.konten_id = p1.konten_id AND p2.grup_ke = p1.grup_ke
      WHERE p1.konten_id = :k AND p1.mahasiswa_id = :m`,
    { k: konten.id, m: mahasiswaId }
  );
  const ids = rows.map((x) => x.id);
  return ids.includes(mahasiswaId) ? ids : [mahasiswaId, ...ids];
};

const kumpulkanTugas = async (mahasiswaId, kontenId, { isi, lampiran, lampiranNama } = {}) => {
  const r = await kontenTerbuka(mahasiswaId, kontenId, 'Tugas');
  if (r.jenis !== 'TUGAS') throw new ApiError(400, 'Konten ini bukan tugas');
  // Tugas grup: satu pengumpulan berlaku untuk seluruh anggota grup.
  const anggota = await anggotaSegrup(r, mahasiswaId);
  const semuaLama = await ElearningTugasJawaban.findAll({ where: { kontenId: r.id, mahasiswaId: anggota } });
  const lama = semuaLama.find((x) => x.mahasiswaId === mahasiswaId) ?? semuaLama[0] ?? null;
  if (semuaLama.some((x) => x.dinilaiAt)) throw new ApiError(400, 'Tugas sudah dinilai dosen dan tidak bisa diubah');
  const teks = String(isi ?? '').trim() || null;
  // lampiran: undefined = tidak diubah (saat memperbarui), null = hapus, data URL = ganti.
  const fileBaru = lampiran === undefined ? (lama?.lampiran ?? null) : lampiran || null;
  if (!teks && !fileBaru) throw new ApiError(400, 'Isi jawaban atau unggah file tugas');
  if (lampiran && ukuranDataUrl(lampiran) > MAKS_LAMPIRAN) throw new ApiError(400, 'Ukuran file maksimal 10 MB');
  const values = {
    isi: teks,
    lampiran: fileBaru,
    lampiranNama: fileBaru ? (lampiran ? lampiranNama || 'jawaban' : lama?.lampiranNama) : null,
    terlambat: !!r.tenggat && new Date(r.tenggat) < new Date(),
    dikumpulkanOleh: mahasiswaId,
  };
  await sequelize.transaction(async (transaction) => {
    for (const id of anggota) {
      const baris = semuaLama.find((x) => x.mahasiswaId === id);
      if (baris) await baris.update(values, { transaction });
      else await ElearningTugasJawaban.create({ ...values, kontenId: r.id, mahasiswaId: id }, { transaction });
    }
  });
  return { terlambat: values.terlambat, untukGrup: anggota.length > 1 };
};

/** Kirim jawaban kuis (sekali), skor = benar ÷ jumlah soal × 100. */
/** Jumlah soal yang sudah dipilih jawabannya di draf (JSON). */
const hitungTerjawab = (json) => {
  try {
    return Object.values(JSON.parse(json || '{}')).filter((v) => Number.isInteger(v)).length;
  } catch {
    return 0;
  }
};

/** Simpan draf pengerjaan kuis (jawaban sementara) — hanya bila belum dikirim & batas waktu belum lewat. */
const simpanDrafKuis = async (mahasiswaId, kontenId, jawaban = {}) => {
  const r = await kontenTerbuka(mahasiswaId, kontenId, 'Kuis');
  if (r.jenis !== 'KUIS') throw new ApiError(400, 'Konten ini bukan kuis');
  if (r.dikerjakan) throw new ApiError(400, 'Kuis ini sudah Anda kirim');
  if (r.tenggat && new Date(r.tenggat) < new Date()) throw new ApiError(400, 'Batas waktu pengerjaan kuis sudah lewat');
  if (r.durasiMenit && !r.mulaiAt) throw new ApiError(400, 'Mulai kuis terlebih dahulu');
  const batas = batasAkhirKuis(r);
  if (r.durasiMenit && batas && batas.getTime() + TOLERANSI_KIRIM_MS < Date.now()) throw new ApiError(400, 'Waktu pengerjaan kuis sudah habis');
  const soal = await ElearningSoal.findAll({ where: { kontenId: r.id }, attributes: ['id', 'pilihan'] });
  // Hanya simpan jawaban untuk soal kuis ini dengan indeks pilihan yang valid.
  const bersih = Object.fromEntries(soal.map((s) => [s.id, Number.isInteger(jawaban[s.id]) && jawaban[s.id] >= 0 && jawaban[s.id] < s.pilihan.length ? jawaban[s.id] : null]));
  await sequelize.query(
    'INSERT INTO elearning_kuis_draf (konten_id, mahasiswa_id, jawaban, created_at, updated_at) VALUES (:k, :m, :j, NOW(), NOW()) ON DUPLICATE KEY UPDATE jawaban = VALUES(jawaban), updated_at = NOW()',
    { replacements: { k: r.id, m: mahasiswaId, j: JSON.stringify(bersih) } }
  );
  return { disimpan: new Date(), terjawab: Object.values(bersih).filter((v) => v !== null).length, jumlahSoal: soal.length };
};

const kirimJawaban = async (mahasiswaId, kontenId, jawaban = {}) => {
  const r = await kontenTerbuka(mahasiswaId, kontenId, 'Kuis');
  if (r.jenis !== 'KUIS') throw new ApiError(400, 'Konten ini bukan kuis');
  if (r.dikerjakan) throw new ApiError(400, 'Kuis ini sudah Anda kerjakan');
  if (r.tenggat && new Date(r.tenggat) < new Date()) throw new ApiError(400, 'Batas waktu pengerjaan kuis sudah lewat');
  if (r.durasiMenit && !r.mulaiAt) throw new ApiError(400, 'Mulai kuis terlebih dahulu');
  const soal = await ElearningSoal.findAll({ where: { kontenId: r.id } });
  if (!soal.length) throw new ApiError(400, 'Kuis belum memiliki soal');
  // Durasi habis (lewat toleransi): yang dinilai jawaban draf terakhir yang tersimpan, bukan kiriman terlambat.
  const batas = batasAkhirKuis(r);
  let sumber = jawaban;
  if (r.durasiMenit && batas && batas.getTime() + TOLERANSI_KIRIM_MS < Date.now()) {
    try {
      sumber = JSON.parse(r.drafJawaban || '{}');
    } catch {
      sumber = {};
    }
  }
  const bersih = Object.fromEntries(soal.map((s) => [s.id, Number.isInteger(sumber[s.id]) ? sumber[s.id] : null]));
  const benar = soal.filter((s) => bersih[s.id] === s.jawabanBenar).length;
  const skor = round2((benar / soal.length) * 100);
  await ElearningJawaban.create({ kontenId: r.id, mahasiswaId, jawaban: bersih, benar, jumlahSoal: soal.length, skor });
  // Draf tidak diperlukan lagi setelah jawaban akhir dikirim.
  await sequelize.query('DELETE FROM elearning_kuis_draf WHERE konten_id = :k AND mahasiswa_id = :m', { replacements: { k: r.id, m: mahasiswaId } });
  return hasilTampil(r) ? { benar, jumlahSoal: soal.length, skor, tampilkanHasil: true } : { benar: null, jumlahSoal: soal.length, skor: null, tampilkanHasil: false };
};

/** Mulai mengerjakan kuis berdurasi: catat waktu mulai (sekali); durasi dihitung sejak saat ini. */
const mulaiKuis = async (mahasiswaId, kontenId) => {
  const r = await kontenTerbuka(mahasiswaId, kontenId, 'Kuis');
  if (r.jenis !== 'KUIS') throw new ApiError(400, 'Konten ini bukan kuis');
  if (r.dikerjakan) throw new ApiError(400, 'Kuis ini sudah Anda kerjakan');
  if (r.tenggat && new Date(r.tenggat) < new Date()) throw new ApiError(400, 'Batas waktu pengerjaan kuis sudah lewat');
  await sequelize.query(
    `INSERT INTO elearning_kuis_draf (konten_id, mahasiswa_id, jawaban, mulai_at, created_at, updated_at) VALUES (:k, :m, '{}', NOW(), NOW(), NOW())
     ON DUPLICATE KEY UPDATE mulai_at = COALESCE(mulai_at, NOW())`,
    { replacements: { k: r.id, m: mahasiswaId } }
  );
  return { mulai: true };
};

// ---------------------------------------------------------------- Import soal kuis (Excel)

const HURUF = ['A', 'B', 'C', 'D', 'E', 'F'];
const KOLOM_SOAL = [
  { header: 'No', key: 'no', width: 6 },
  { header: 'Pertanyaan', key: 'pertanyaan', width: 60 },
  ...HURUF.map((h) => ({ header: `Pilihan ${h}`, key: `pilihan${h}`, width: 26 })),
  { header: 'Jawaban Benar', key: 'jawaban', width: 16 },
];

/** Template Excel soal kuis: sheet "Soal" (contoh 2 baris) + sheet "Petunjuk". */
// ---------------------------------------------------------------- Sumber nilai (sinkronisasi Input Nilai)

/**
 * Bahan sinkronisasi Input Nilai kelas: rekap kehadiran tiap mahasiswa & nilai kuis / tugas e-learning (terbit).
 * nilai[mahasiswaId][kontenId] = { nilai, status } — status SELESAI (ada nilai), BELUM_DINILAI (tugas dikumpulkan
 * belum dinilai), BELUM (belum mengerjakan); tidak ada = bukan penerima konten tsb.
 */
const sumberNilaiKelas = async (dosenId, jadwalKuliahId) => {
  const jadwal = await ensureKelasDosen(jadwalKuliahId, dosenId);
  const [rekap, peserta, konten] = await Promise.all([
    rekapKehadiranJadwal(jadwal),
    pesertaKelas(jadwal.id),
    ElearningKonten.findAll({
      where: { jadwalKuliahId: jadwal.id, jenis: ['KUIS', 'TUGAS'], isPublished: true },
      attributes: ['id', 'jenis', 'judul', 'kategori', 'pertemuanKe', 'tenggat', 'target', 'createdAt'],
      order: [['pertemuanKe', 'ASC'], ['createdAt', 'ASC']],
    }),
  ]);
  const ids = konten.map((k) => k.id);
  const [penerima, kuis, tugas] = ids.length
    ? await Promise.all([
        q('SELECT konten_id AS kontenId, mahasiswa_id AS mahasiswaId FROM elearning_konten_mahasiswa WHERE konten_id IN (:ids)', { ids }),
        q('SELECT konten_id AS kontenId, mahasiswa_id AS mahasiswaId, skor FROM elearning_jawaban WHERE konten_id IN (:ids)', { ids }),
        q('SELECT konten_id AS kontenId, mahasiswa_id AS mahasiswaId, nilai FROM elearning_tugas_jawaban WHERE konten_id IN (:ids)', { ids }),
      ])
    : [[], [], []];
  const idPeserta = peserta.map((p) => p.id);
  const kunci = (k, m) => `${k}|${m}`;
  const skorOf = new Map(kuis.map((x) => [kunci(x.kontenId, x.mahasiswaId), Number(x.skor)]));
  const tugasOf = new Map(tugas.map((x) => [kunci(x.kontenId, x.mahasiswaId), x.nilai === null ? null : Number(x.nilai)]));
  const nilai = Object.fromEntries(idPeserta.map((m) => [m, {}]));
  konten.forEach((k) => {
    const tujuan = BERDAFTAR.includes(k.target) ? penerima.filter((p) => p.kontenId === k.id).map((p) => p.mahasiswaId) : idPeserta;
    tujuan.forEach((m) => {
      if (!nilai[m]) return; // penerima di luar peserta kelas
      const key = kunci(k.id, m);
      if (k.jenis === 'KUIS') nilai[m][k.id] = skorOf.has(key) ? { nilai: skorOf.get(key), status: 'SELESAI' } : { nilai: null, status: 'BELUM' };
      else if (!tugasOf.has(key)) nilai[m][k.id] = { nilai: null, status: 'BELUM' };
      else nilai[m][k.id] = tugasOf.get(key) === null ? { nilai: null, status: 'BELUM_DINILAI' } : { nilai: tugasOf.get(key), status: 'SELESAI' };
    });
  });
  return {
    jumlahPertemuan: rekap.pertemuan.length,
    kehadiran: rekap.mahasiswa.map((m) => ({ mahasiswaId: m.mahasiswaId, hadir: m.hadir, izin: m.izin, sakit: m.sakit, alpa: m.alpa })),
    item: konten.map((k) => ({ id: k.id, jenis: k.jenis, judul: k.judul, kategori: k.kategori, pertemuanKe: k.pertemuanKe, tenggat: k.tenggat, target: k.target })),
    nilai,
  };
};

// ---------------------------------------------------------------- Laporan tugas (dosen)

/** Semua tugas kelas (atau satu tugas) + pengumpulan tiap mahasiswa. */
const dataLaporanTugas = async (dosenId, jadwalKuliahId, kontenId = null) => {
  const jadwal = await ensureKelasDosen(jadwalKuliahId, dosenId);
  const tugas = await ElearningKonten.findAll({
    where: { jadwalKuliahId: jadwal.id, jenis: 'TUGAS', ...(kontenId ? { id: kontenId } : {}) },
    attributes: ['id'],
    order: [['pertemuanKe', 'ASC'], ['createdAt', 'ASC']],
  });
  if (kontenId && !tugas.length) throw new ApiError(404, 'Tugas tidak ditemukan di kelas ini');
  const detail = [];
  for (const t of tugas) detail.push(await pengumpulanTugas(dosenId, t.id));
  return {
    kelas: {
      id: jadwal.id,
      kelas: jadwal.kelas,
      kodeMataKuliah: jadwal.kodeMataKuliah,
      namaMataKuliah: jadwal.namaMataKuliah,
      tahunAjaran: jadwal.tahunAjaran?.nama ?? null,
    },
    detail,
  };
};

/** Ringkasan laporan tugas per kelas (untuk tabel sebelum diunduh). */
const laporanTugasKelas = async (dosenId, jadwalKuliahId) => {
  const { kelas, detail } = await dataLaporanTugas(dosenId, jadwalKuliahId);
  return {
    kelas,
    tugas: detail.map(({ konten, ringkasan }) => ({
      id: konten.id,
      judul: konten.judul,
      pertemuanKe: konten.pertemuanKe,
      tenggat: konten.tenggat,
      target: konten.target,
      isPublished: konten.isPublished,
      ...ringkasan,
    })),
  };
};

const waktuWib = (v) =>
  v
    ? new Date(v).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '';
/** 3725 → '1 j 2 mnt 5 dtk'. */
const teksDurasi = (detik) => {
  const d = Number(detik) || 0;
  if (!d) return '-';
  const j = Math.floor(d / 3600);
  const m = Math.floor((d % 3600) / 60);
  const s = d % 60;
  return [j && `${j} j`, m && `${m} mnt`, !j && s && `${s} dtk`].filter(Boolean).join(' ');
};
const namaSheet = (teks, dipakai) => {
  const dasar = String(teks).replace(/[\\/*?:[\]]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 31) || 'Sheet';
  let nama = dasar;
  for (let i = 2; dipakai.has(nama.toLowerCase()); i += 1) nama = `${dasar.slice(0, 27)} (${i})`;
  dipakai.add(nama.toLowerCase());
  return nama;
};
/** Judul + baris info di atas tabel, header tebal berlatar, border tipis; kembalikan worksheet. */
const tulisSheet = (workbook, nama, judul, info, kolom, rows) => {
  const ws = workbook.addWorksheet(nama);
  ws.columns = kolom.map((k) => ({ key: k.key, width: k.width ?? 16 }));
  ws.addRow([judul]).font = { bold: true, size: 13 };
  info.forEach((t) => (ws.addRow([t]).font = { color: { argb: 'FF555555' } }));
  ws.addRow([]);
  const header = ws.addRow(kolom.map((k) => k.header));
  header.font = { bold: true };
  header.alignment = { vertical: 'middle', wrapText: true };
  header.eachCell((c) => {
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1E7CF' } };
  });
  rows.forEach((r) => {
    const row = ws.addRow(kolom.map((k) => r[k.key] ?? ''));
    row.alignment = { vertical: 'top', wrapText: true };
  });
  const garis = { style: 'thin', color: { argb: 'FFD0D0D0' } };
  for (let i = header.number; i <= ws.rowCount; i += 1) {
    ws.getRow(i).eachCell({ includeEmpty: true }, (c) => (c.border = { top: garis, left: garis, bottom: garis, right: garis }));
  }
  ws.views = [{ state: 'frozen', ySplit: header.number }];
  return ws;
};

/** Excel laporan tugas: sheet Rekap Nilai (mahasiswa × tugas) + satu sheet detail per tugas. */
const exportLaporanTugas = async (dosenId, jadwalKuliahId, kontenId = null) => {
  const { kelas, detail } = await dataLaporanTugas(dosenId, jadwalKuliahId, kontenId);
  const workbook = new ExcelJS.Workbook();
  const dipakai = new Set();
  const judulKelas = `${kelas.namaMataKuliah} (${kelas.kodeMataKuliah}) · Kelas ${kelas.kelas}${kelas.tahunAjaran ? ` · ${kelas.tahunAjaran}` : ''}`;
  const diunduh = `Diunduh ${waktuWib(new Date())} WIB`;
  const status = (r) => (!r.jawabanId ? 'Belum mengumpulkan' : r.terlambat ? 'Terlambat' : 'Tepat waktu');

  if (!kontenId) {
    // Rekap: semua mahasiswa yang menjadi tujuan minimal satu tugas.
    const mhs = new Map();
    detail.forEach((d) => d.rows.forEach((r) => !mhs.has(r.id) && mhs.set(r.id, r)));
    const kolom = [
      { header: 'No', key: 'no', width: 5 },
      { header: 'NIM', key: 'nim', width: 14 },
      { header: 'Nama', key: 'nama', width: 30 },
      ...detail.map((d, i) => ({ header: `T${i + 1}. ${d.konten.judul}`, key: `t${d.konten.id}`, width: 16 })),
      { header: 'Dikumpulkan', key: 'kumpul', width: 13 },
      { header: 'Rata-rata Nilai', key: 'rata', width: 14 },
    ];
    const rows = [...mhs.values()]
      .sort((a, b) => String(a.nim).localeCompare(String(b.nim)))
      .map((m, i) => {
        const row = { no: i + 1, nim: m.nim, nama: m.nama };
        const nilai = [];
        let kumpul = 0;
        let ditugaskan = 0;
        detail.forEach((d) => {
          const r = d.rows.find((x) => x.id === m.id);
          if (!r) return; // bukan tujuan tugas ini → kosong
          ditugaskan += 1;
          if (r.jawabanId) kumpul += 1;
          if (r.nilai !== null && r.nilai !== undefined) nilai.push(Number(r.nilai));
          row[`t${d.konten.id}`] = r.nilai !== null && r.nilai !== undefined ? Number(r.nilai) : r.jawabanId ? 'Belum dinilai' : 'Belum kumpul';
        });
        row.kumpul = `${kumpul}/${ditugaskan}`;
        row.rata = nilai.length ? round2(nilai.reduce((s, v) => s + v, 0) / nilai.length) : '';
        return row;
      });
    tulisSheet(workbook, namaSheet('Rekap Nilai', dipakai), `Rekap Nilai Tugas — ${judulKelas}`, [diunduh, `${detail.length} tugas · kosong = bukan penerima tugas`], kolom, rows);
  }

  const kolomDetail = [
    { header: 'No', key: 'no', width: 5 },
    { header: 'NIM', key: 'nim', width: 14 },
    { header: 'Nama', key: 'nama', width: 30 },
    { header: 'Grup', key: 'grup', width: 14 },
    { header: 'Status', key: 'status', width: 18 },
    { header: 'Waktu Kumpul (WIB)', key: 'waktu', width: 19 },
    { header: 'Dikumpulkan Oleh', key: 'oleh', width: 24 },
    { header: 'Durasi Membuka', key: 'durasi', width: 15 },
    { header: 'Jawaban', key: 'isi', width: 45 },
    { header: 'File', key: 'file', width: 24 },
    { header: 'Nilai', key: 'nilai', width: 8 },
    { header: 'Catatan Dosen', key: 'catatan', width: 35 },
    { header: 'Dinilai (WIB)', key: 'dinilai', width: 19 },
  ];
  detail.forEach((d, i) => {
    const { konten, ringkasan } = d;
    const rows = d.rows.map((r, n) => ({
      no: n + 1,
      nim: r.nim,
      nama: r.nama,
      grup: r.grup ?? '',
      status: status(r),
      waktu: waktuWib(r.dikumpulkan),
      oleh: r.jawabanId ? r.dikumpulkanOleh ?? 'Sendiri' : '',
      durasi: teksDurasi(r.durasi),
      isi: r.isi ?? '',
      file: r.lampiranNama ?? '',
      nilai: r.nilai ?? '',
      catatan: r.catatan ?? '',
      dinilai: waktuWib(r.dinilaiAt),
    }));
    const info = [
      judulKelas,
      `${konten.pertemuanKe ? `Pertemuan ${konten.pertemuanKe} · ` : ''}Tenggat ${konten.tenggat ? `${waktuWib(konten.tenggat)} WIB` : '-'}${konten.target === 'GRUP' ? ' · Tugas grup' : ''}${konten.isPublished ? '' : ' · DRAF'}`,
      `Penerima ${ringkasan.penerima} · Dikumpulkan ${ringkasan.dikumpulkan} · Terlambat ${ringkasan.terlambat} · Dinilai ${ringkasan.dinilai} · Rata-rata ${ringkasan.rataNilai ?? '-'}`,
      diunduh,
    ];
    const kolom = konten.target === 'GRUP' ? kolomDetail : kolomDetail.filter((k) => k.key !== 'grup' && k.key !== 'oleh');
    tulisSheet(workbook, namaSheet(`T${i + 1} ${konten.judul}`, dipakai), `Tugas: ${konten.judul}`, info, kolom, rows);
  });
  if (!detail.length) tulisSheet(workbook, 'Rekap Nilai', `Laporan Tugas — ${judulKelas}`, [diunduh, 'Belum ada tugas di kelas ini.'], [{ header: '-', key: 'x' }], []);

  const aman = (t) => String(t ?? '').replace(/[^A-Za-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
  const filename = kontenId
    ? `laporan-tugas-${aman(detail[0].konten.judul).slice(0, 40)}-${aman(kelas.kodeMataKuliah)}-${aman(kelas.kelas)}.xlsx`
    : `laporan-tugas-${aman(kelas.kodeMataKuliah)}-${aman(kelas.kelas)}.xlsx`;
  return { workbook, filename };
};

const templateSoal = () => {
  const workbook = buildWorkbook('Soal', KOLOM_SOAL, [
    { no: 1, pertanyaan: 'Ibu kota Indonesia adalah ...', pilihanA: 'Bandung', pilihanB: 'Jakarta', pilihanC: 'Surabaya', pilihanD: 'Medan', jawaban: 'B' },
    { no: 2, pertanyaan: 'Komunikasi publik rumah sakit bertujuan ...', pilihanA: 'Membangun citra & kepercayaan', pilihanB: 'Menambah jumlah pegawai', jawaban: 'A' },
  ]);
  const petunjuk = workbook.addWorksheet('Petunjuk');
  petunjuk.columns = [{ width: 110 }];
  [
    'PETUNJUK IMPORT SOAL KUIS',
    '',
    '1. Isi soal di sheet "Soal", satu baris = satu soal. Jangan ubah judul kolom di baris pertama.',
    '2. Kolom "Pertanyaan" wajib diisi.',
    '3. Isi minimal 2 pilihan jawaban (Pilihan A & B). Pilihan C–F opsional; kosongkan bila tidak dipakai.',
    '4. Kolom "Jawaban Benar" diisi huruf pilihan yang benar: A, B, C, D, E, atau F (boleh juga angka 1–6).',
    '5. Kolom "No" hanya penanda urutan; soal diurutkan sesuai urutan baris.',
    '6. Setelah import, soal tampil di form kuis untuk diperiksa — klik Simpan untuk menyimpannya.',
  ].forEach((t, i) => {
    const row = petunjuk.addRow([t]);
    if (i === 0) row.font = { bold: true, size: 13 };
  });
  return workbook;
};

/** Baca soal dari Excel (tanpa menyimpan): kembalikan soal valid + daftar kesalahan per baris. */
const importSoal = async (file) => {
  let rows;
  try {
    rows = await parseWorkbookFromBase64(file);
  } catch {
    throw new ApiError(400, 'File tidak bisa dibaca. Gunakan file Excel (.xlsx) dari template.');
  }
  if (!rows.length) throw new ApiError(400, 'File tidak berisi soal');
  const header = Object.keys(rows[0].data);
  if (!header.includes('Pertanyaan') || !header.includes('Jawaban Benar')) {
    throw new ApiError(400, 'Format kolom tidak sesuai. Unduh template lalu isi tanpa mengubah judul kolom.');
  }
  const soal = [];
  const errors = [];
  rows.forEach(({ rowNumber, data }) => {
    const pertanyaan = cellString(data.Pertanyaan);
    // Pilihan yang diisi beserta huruf kolom aslinya (huruf dipakai untuk mencocokkan Jawaban Benar).
    const terisi = HURUF.map((h) => ({ h, teks: cellString(data[`Pilihan ${h}`]) })).filter((p) => p.teks);
    const raw = cellString(data['Jawaban Benar']).toUpperCase();
    const huruf = /^[1-6]$/.test(raw) ? HURUF[Number(raw) - 1] : raw;
    if (!pertanyaan) return errors.push({ row: rowNumber, message: 'Pertanyaan kosong' });
    if (terisi.length < 2) return errors.push({ row: rowNumber, message: 'Minimal 2 pilihan jawaban' });
    if (!huruf) return errors.push({ row: rowNumber, message: 'Jawaban Benar kosong' });
    const jawabanBenar = terisi.findIndex((p) => p.h === huruf);
    if (jawabanBenar < 0) return errors.push({ row: rowNumber, message: `Jawaban Benar "${raw}" tidak cocok dengan pilihan yang diisi` });
    soal.push({ pertanyaan, pilihan: terisi.map((p) => p.teks), jawabanBenar });
    return null;
  });
  return { soal, errors, totalBaris: rows.length };
};

/** Mahasiswa: isi satu gambar / dokumen materi yang terbuka untuknya. */
const berkasMahasiswa = async (mahasiswaId, kontenId, berkasId) => isiBerkas((await kontenTerbuka(mahasiswaId, kontenId)).id, berkasId);

module.exports = {
  JENIS,
  tambahBerkas,
  hapusBerkas,
  berkasDosen,
  berkasMahasiswa,
  daftarBerkas,
  isiBerkas,
  sqlSampul,
  templateSoal,
  importSoal,
  listKelasDosen,
  listKontenDosen,
  laporanKelas,
  ringkasanDosen,
  toggleSukaDosen,
  listKomentarDosen,
  tambahKomentarDosen,
  hapusKomentarDosen,
  kelasDosen,
  getKontenDosen,
  saveKonten,
  deleteKonten,
  hasilKuis,
  resetKuisMahasiswa,
  listKontenMahasiswa,
  toggleSukaMahasiswa,
  listKomentarMahasiswa,
  tambahKomentarMahasiswa,
  hapusKomentarMahasiswa,
  kelasMahasiswa,
  timMahasiswa,
  tambahDurasi,
  laporanTugasKelas,
  sumberNilaiKelas,
  exportLaporanTugas,
  riwayatBelajar,
  getKontenMahasiswa,
  kirimJawaban,
  mulaiKuis,
  tandaiSelesai,
  kumpulkanTugas,
  simpanDrafKuis,
  pengumpulanTugas,
  lampiranJawabanTugas,
  nilaiTugas,
};
