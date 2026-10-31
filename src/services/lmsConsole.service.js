const ExcelJS = require('exceljs');
const { sequelize, ElearningKonten } = require('../models');
const ApiError = require('../utils/ApiError');
const { listTahunAkademik, listProdi } = require('./academicContext.service');

/**
 * Konsol LMS (modul staf /lms, mis. superadmin): pemantauan e-learning seluruh kampus pada satu tahun akademik —
 * data diambil dari e-learning portal dosen & mahasiswa (elearning_konten, lihat, progres, jawaban kuis,
 * pengumpulan tugas, komentar & suka). Filter umum: tahunAjaranId (default tahun ajaran aktif), kodeProdi
 * (prodi mata kuliah via kurikulum), search.
 *
 * "Selesai" per konten: KUIS = sudah mengirim jawaban, TUGAS = sudah mengumpulkan, MATERI/VIDEO = ditandai selesai.
 * Penerima: SEMUA = peserta kelas (KRS disetujui), KAMPUS = mahasiswa aktif kampus, PILIHAN/GRUP = yang dipilih dosen.
 */
const q = (sql, replacements = {}) => sequelize.query(sql, { replacements, type: sequelize.QueryTypes.SELECT });
const round2 = (v) => Math.round(Number(v) * 100) / 100;
const persen = (a, b) => (b ? round2((a / b) * 100) : null);
const JENIS = ['MATERI', 'VIDEO', 'KUIS', 'TUGAS'];
const BERDAFTAR = ['PILIHAN', 'GRUP'];
const NAMA_DOSEN = "CONCAT_WS(', ', NULLIF(d.nama_lengkap, ''), NULLIF(d.gelar, ''))";

// ---------------------------------------------------------------- Filter & kelas

const opsi = async () => {
  const [tahunAkademik, prodi] = await Promise.all([listTahunAkademik(), listProdi()]);
  return { tahunAkademik, prodi: prodi.map((p) => ({ kodeProdi: p.kodeProdi, nama: p.nama })) };
};

const resolveFilter = async (query = {}) => {
  const tahunAjaranId = Number(query.tahunAjaranId) || (await q('SELECT id FROM tahun_ajaran WHERE is_active = 1 ORDER BY id DESC LIMIT 1'))[0]?.id || null;
  let jurusanIds = null;
  if (query.kodeProdi) {
    const prodi = (await listProdi()).find((p) => p.kodeProdi === query.kodeProdi);
    jurusanIds = prodi ? prodi.jurusanIds : [-1];
  }
  return { tahunAjaranId, jurusanIds, search: String(query.search ?? '').trim().toLowerCase() };
};

const SQL_KELAS = `SELECT j.id, j.kelas, j.kode_mata_kuliah AS kodeMataKuliah, j.nama_mata_kuliah AS namaMataKuliah, j.sks, j.semester, j.ruangan,
    mk.ikon, ju.kode_prodi AS kodeProdi, ju.nama_jurusan AS prodi, ${NAMA_DOSEN} AS dosen,
    ta.nama AS tahunAjaran, ta.jenis_semester AS jenisSemester
  FROM jadwal_kuliah j
  LEFT JOIN mata_kuliah mk ON mk.id = j.mata_kuliah_id
  LEFT JOIN kurikulum ku ON ku.id = mk.kurikulum_id
  LEFT JOIN jurusan ju ON ju.id = ku.jurusan_id
  LEFT JOIN dosen d ON d.id = j.dosen_kordinator_id
  LEFT JOIN tahun_ajaran ta ON ta.id = j.tahun_ajaran_id`;

/** Kelas (jadwal kuliah aktif) pada tahun akademik & prodi filter; `cari` = saring nama/kode MK, kelas, dosen. */
const daftarKelas = async (f, cari = true) => {
  const where = ['j.tahun_ajaran_id = :ta', 'j.is_active = 1'];
  if (f.jurusanIds) where.push('ku.jurusan_id IN (:jur)');
  if (cari && f.search) where.push('(LOWER(j.nama_mata_kuliah) LIKE :s OR LOWER(j.kode_mata_kuliah) LIKE :s OR LOWER(j.kelas) LIKE :s OR LOWER(d.nama_lengkap) LIKE :s)');
  return q(`${SQL_KELAS} WHERE ${where.join(' AND ')} ORDER BY j.nama_mata_kuliah, j.kelas`, { ta: f.tahunAjaranId ?? 0, jur: f.jurusanIds, s: `%${f.search}%` });
};

const pengampuMap = async (ids) => {
  if (!ids.length) return new Map();
  const rows = await q(
    `SELECT p.jadwal_kuliah_id AS id, ${NAMA_DOSEN} AS nama FROM jadwal_kuliah_dosen_pengampu p JOIN dosen d ON d.id = p.dosen_id WHERE p.jadwal_kuliah_id IN (:ids)`,
    { ids }
  );
  const map = new Map();
  rows.forEach((r) => map.set(Number(r.id), [...(map.get(Number(r.id)) ?? []), r.nama]));
  return map;
};

const pesertaMap = async (ids) => {
  if (!ids.length) return new Map();
  const rows = await q(
    `SELECT d.jadwal_kuliah_id AS id, COUNT(DISTINCT k.mahasiswa_id) AS n FROM krs_detail d JOIN krs k ON k.id = d.krs_id AND k.status = 'DISETUJUI'
      WHERE d.jadwal_kuliah_id IN (:ids) GROUP BY d.jadwal_kuliah_id`,
    { ids }
  );
  return new Map(rows.map((r) => [Number(r.id), Number(r.n)]));
};

const pesertaKelas = (jadwalKuliahId) =>
  q(
    `SELECT DISTINCT m.id, m.nim, m.nama_lengkap AS nama
       FROM krs_detail d JOIN krs k ON k.id = d.krs_id AND k.status = 'DISETUJUI' JOIN mahasiswa m ON m.id = k.mahasiswa_id
      WHERE d.jadwal_kuliah_id = :id ORDER BY m.nim`,
    { id: jadwalKuliahId }
  );

const jumlahMahasiswaKampus = async () => Number((await q('SELECT COUNT(*) AS n FROM mahasiswa WHERE is_active = 1 AND status_keluar IS NULL'))[0].n);

const labelTa = (r) => (r?.tahunAjaran ? `${r.tahunAjaran}${r.jenisSemester ? ` ${r.jenisSemester}` : ''}` : null);

// ---------------------------------------------------------------- Konten & statistik

const SQL_KONTEN = `SELECT c.id, c.jadwal_kuliah_id AS jadwalKuliahId, c.dosen_id AS dosenId, c.jenis, c.judul, c.kategori, c.is_wajib AS isWajib,
    c.pertemuan_ke AS pertemuanKe, c.tenggat, c.target, c.is_published AS isPublished, c.tersedia_mulai AS tersediaMulai, c.tersedia_sampai AS tersediaSampai,
    c.created_at AS createdAt, c.updated_at AS updatedAt, ${NAMA_DOSEN} AS namaDosen
  FROM elearning_konten c LEFT JOIN dosen d ON d.id = c.dosen_id`;
const bentukKonten = (k) => ({ ...k, id: Number(k.id), jadwalKuliahId: Number(k.jadwalKuliahId), isWajib: !!Number(k.isWajib), isPublished: !!Number(k.isPublished) });

const kontenDiKelas = async (jadwalIds, jenis = JENIS) =>
  jadwalIds.length
    ? (await q(`${SQL_KONTEN} WHERE c.jadwal_kuliah_id IN (:ids) AND c.jenis IN (:jenis) ORDER BY c.created_at DESC`, { ids: jadwalIds, jenis })).map(bentukKonten)
    : [];

/** Statistik per konten: penerima, mahasiswa melihat, selesai, rata skor/nilai, tugas belum dinilai & terlambat, soal, komentar, suka. */
const statKonten = async (konten, pesertaOf) => {
  const ids = konten.map((k) => k.id);
  if (!ids.length) return new Map();
  const [daftar, lihat, progres, jawaban, tugas, soal, komentar, suka] = await Promise.all([
    q('SELECT konten_id AS id, COUNT(*) AS n FROM elearning_konten_mahasiswa WHERE konten_id IN (:ids) GROUP BY konten_id', { ids }),
    q('SELECT konten_id AS id, COUNT(*) AS n, SUM(jumlah) AS total FROM elearning_lihat WHERE konten_id IN (:ids) GROUP BY konten_id', { ids }),
    q('SELECT konten_id AS id, COUNT(*) AS n FROM elearning_progres WHERE konten_id IN (:ids) GROUP BY konten_id', { ids }),
    q('SELECT konten_id AS id, COUNT(*) AS n, AVG(skor) AS rata FROM elearning_jawaban WHERE konten_id IN (:ids) GROUP BY konten_id', { ids }),
    q(
      `SELECT konten_id AS id, COUNT(*) AS n, AVG(nilai) AS rata, SUM(nilai IS NULL) AS belum, SUM(terlambat) AS telat
         FROM elearning_tugas_jawaban WHERE konten_id IN (:ids) GROUP BY konten_id`,
      { ids }
    ),
    q('SELECT konten_id AS id, COUNT(*) AS n FROM elearning_soal WHERE konten_id IN (:ids) GROUP BY konten_id', { ids }),
    q('SELECT konten_id AS id, COUNT(*) AS n FROM elearning_komentar WHERE konten_id IN (:ids) GROUP BY konten_id', { ids }),
    q('SELECT konten_id AS id, COUNT(*) AS n FROM elearning_suka WHERE konten_id IN (:ids) GROUP BY konten_id', { ids }),
  ]);
  const peta = (rows) => new Map(rows.map((r) => [Number(r.id), r]));
  const [daftarOf, lihatOf, progresOf, jawabanOf, tugasOf, soalOf, komentarOf, sukaOf] = [daftar, lihat, progres, jawaban, tugas, soal, komentar, suka].map(peta);
  const nKampus = konten.some((k) => k.target === 'KAMPUS') ? await jumlahMahasiswaKampus() : 0;
  const angka = (map, id, f = 'n') => Number(map.get(id)?.[f] ?? 0);
  return new Map(
    konten.map((k) => {
      const penerima = BERDAFTAR.includes(k.target) ? angka(daftarOf, k.id) : k.target === 'KAMPUS' ? nKampus : pesertaOf.get(k.jadwalKuliahId) ?? 0;
      const sumber = k.jenis === 'KUIS' ? jawabanOf : k.jenis === 'TUGAS' ? tugasOf : progresOf;
      const selesai = angka(sumber, k.id);
      const adaRata = ['KUIS', 'TUGAS'].includes(k.jenis) && sumber.get(k.id)?.rata != null;
      return [
        k.id,
        {
          penerima,
          melihat: angka(lihatOf, k.id),
          dilihat: angka(lihatOf, k.id, 'total'),
          selesai,
          penyelesaian: persen(Math.min(selesai, penerima || selesai), penerima),
          rata: adaRata ? round2(sumber.get(k.id).rata) : null,
          belumDinilai: k.jenis === 'TUGAS' ? angka(tugasOf, k.id, 'belum') : 0,
          terlambat: k.jenis === 'TUGAS' ? angka(tugasOf, k.id, 'telat') : 0,
          soal: angka(soalOf, k.id),
          komentar: angka(komentarOf, k.id),
          suka: angka(sukaOf, k.id),
        },
      ];
    })
  );
};

/** Mahasiswa unik yang beraktivitas (melihat / selesai / kuis / tugas) pada konten tsb, per kelas & total. */
const mahasiswaAktif = async (kontenIds) => {
  if (!kontenIds.length) return { perKelas: new Map(), total: 0 };
  const sub = `SELECT konten_id, mahasiswa_id FROM elearning_lihat WHERE konten_id IN (:ids)
    UNION SELECT konten_id, mahasiswa_id FROM elearning_progres WHERE konten_id IN (:ids)
    UNION SELECT konten_id, mahasiswa_id FROM elearning_jawaban WHERE konten_id IN (:ids)
    UNION SELECT konten_id, mahasiswa_id FROM elearning_tugas_jawaban WHERE konten_id IN (:ids)`;
  const [perKelas, [total]] = await Promise.all([
    q(`SELECT c.jadwal_kuliah_id AS id, COUNT(DISTINCT a.mahasiswa_id) AS n FROM (${sub}) a JOIN elearning_konten c ON c.id = a.konten_id GROUP BY c.jadwal_kuliah_id`, { ids: kontenIds }),
    q(`SELECT COUNT(DISTINCT a.mahasiswa_id) AS n FROM (${sub}) a`, { ids: kontenIds }),
  ]);
  return { perKelas: new Map(perKelas.map((r) => [Number(r.id), Number(r.n)])), total: Number(total?.n ?? 0) };
};

/** Rekap e-learning per kelas (konten terbit): jumlah konten per jenis, penyelesaian, keaktifan, rata kuis/tugas. */
const rekapKelas = async (kelas) => {
  const ids = kelas.map((k) => Number(k.id));
  const [pesertaOf, pengampuOf, semuaKonten] = await Promise.all([pesertaMap(ids), pengampuMap(ids), kontenDiKelas(ids)]);
  const konten = semuaKonten.filter((k) => k.isPublished);
  const [stat, aktif] = await Promise.all([statKonten(konten, pesertaOf), mahasiswaAktif(konten.map((k) => k.id))]);
  const rows = kelas.map((j) => {
    const id = Number(j.id);
    const milik = konten.filter((k) => k.jadwalKuliahId === id);
    const st = milik.map((k) => ({ k, s: stat.get(k.id) }));
    const jumlah = Object.fromEntries(JENIS.map((x) => [x.toLowerCase(), milik.filter((k) => k.jenis === x).length]));
    const penugasan = st.reduce((s, { s: x }) => s + x.penerima, 0);
    const selesai = st.reduce((s, { s: x }) => s + Math.min(x.selesai, x.penerima || x.selesai), 0);
    const rataJenis = (jenis) => {
      const list = st.filter(({ k, s }) => k.jenis === jenis && s.rata != null);
      const n = list.reduce((s, { s: x }) => s + x.selesai, 0);
      return n ? round2(list.reduce((s, { s: x }) => s + x.rata * x.selesai, 0) / n) : null;
    };
    const peserta = pesertaOf.get(id) ?? 0;
    const aktifN = aktif.perKelas.get(id) ?? 0;
    return {
      id,
      kelas: j.kelas,
      kodeMataKuliah: j.kodeMataKuliah,
      namaMataKuliah: j.namaMataKuliah,
      ikon: j.ikon ?? null,
      sks: j.sks,
      semester: j.semester,
      kodeProdi: j.kodeProdi ?? null,
      prodi: j.prodi ?? null,
      dosen: j.dosen ?? null,
      pengampu: pengampuOf.get(id) ?? [],
      peserta,
      jumlah,
      totalKonten: milik.length,
      draf: semuaKonten.filter((k) => k.jadwalKuliahId === id && !k.isPublished).length,
      mahasiswaAktif: aktifN,
      keaktifan: persen(Math.min(aktifN, peserta || aktifN), peserta),
      penugasan,
      selesai,
      penyelesaian: persen(selesai, penugasan),
      rataKuis: rataJenis('KUIS'),
      rataTugas: rataJenis('TUGAS'),
      tugasBelumDinilai: st.reduce((s, { s: x }) => s + x.belumDinilai, 0),
      interaksi: st.reduce((s, { s: x }) => s + x.komentar + x.suka, 0),
      kontenTerakhir: milik.reduce((t, k) => (!t || new Date(k.updatedAt) > new Date(t) ? k.updatedAt : t), null),
    };
  });
  return { rows, konten, semuaKonten, stat, aktifTotal: aktif.total };
};

// ---------------------------------------------------------------- Dashboard

const AWAL_MINGGU = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
};

const dashboard = async (query) => {
  const f = await resolveFilter(query);
  const kelas = await daftarKelas(f, false);
  const { rows, konten, semuaKonten, stat, aktifTotal } = await rekapKelas(kelas);
  const kontenIds = semuaKonten.map((k) => k.id);
  const statList = konten.map((k) => ({ k, s: stat.get(k.id) }));
  const penugasan = rows.reduce((s, r) => s + r.penugasan, 0);
  const selesai = rows.reduce((s, r) => s + r.selesai, 0);
  const rataBerbobot = (jenis) => {
    const list = statList.filter(({ k, s }) => k.jenis === jenis && s.rata != null);
    const n = list.reduce((s, { s: x }) => s + x.selesai, 0);
    return n ? round2(list.reduce((s, { s: x }) => s + x.rata * x.selesai, 0) / n) : null;
  };

  // Tren 12 minggu terakhir: konten dibuat dosen & aktivitas mahasiswa (selesai materi, kuis, tugas, komentar).
  const mulai = AWAL_MINGGU(new Date());
  mulai.setDate(mulai.getDate() - 7 * 11);
  const [aktivitas, terbaru] = kontenIds.length
    ? await Promise.all([
        q(
          `SELECT created_at AS t FROM elearning_progres WHERE konten_id IN (:ids) AND created_at >= :mulai
           UNION ALL SELECT created_at FROM elearning_jawaban WHERE konten_id IN (:ids) AND created_at >= :mulai
           UNION ALL SELECT created_at FROM elearning_tugas_jawaban WHERE konten_id IN (:ids) AND created_at >= :mulai
           UNION ALL SELECT created_at FROM elearning_komentar WHERE konten_id IN (:ids) AND mahasiswa_id IS NOT NULL AND created_at >= :mulai`,
          { ids: kontenIds, mulai }
        ),
        q(
          `SELECT * FROM (
             SELECT 'KONTEN' AS tipe, c.id AS kontenId, c.created_at AS waktu, ${NAMA_DOSEN} AS pelaku, 'DOSEN' AS peran FROM elearning_konten c LEFT JOIN dosen d ON d.id = c.dosen_id WHERE c.id IN (:ids)
             UNION ALL SELECT 'KUIS', j.konten_id, j.created_at, m.nama_lengkap, 'MAHASISWA' FROM elearning_jawaban j JOIN mahasiswa m ON m.id = j.mahasiswa_id WHERE j.konten_id IN (:ids)
             UNION ALL SELECT 'TUGAS', t.konten_id, t.created_at, m.nama_lengkap, 'MAHASISWA' FROM elearning_tugas_jawaban t JOIN mahasiswa m ON m.id = t.mahasiswa_id WHERE t.konten_id IN (:ids)
             UNION ALL SELECT 'SELESAI', p.konten_id, p.created_at, m.nama_lengkap, 'MAHASISWA' FROM elearning_progres p JOIN mahasiswa m ON m.id = p.mahasiswa_id WHERE p.konten_id IN (:ids)
             UNION ALL SELECT 'KOMENTAR', km.konten_id, km.created_at, COALESCE(m.nama_lengkap, ${NAMA_DOSEN}), IF(km.mahasiswa_id IS NULL, 'DOSEN', 'MAHASISWA')
               FROM elearning_komentar km LEFT JOIN mahasiswa m ON m.id = km.mahasiswa_id LEFT JOIN dosen d ON d.id = km.dosen_id WHERE km.konten_id IN (:ids)
           ) x ORDER BY waktu DESC LIMIT 10`,
          { ids: kontenIds }
        ),
      ])
    : [[], []];
  const minggu = Array.from({ length: 12 }, (_, i) => {
    const awal = new Date(mulai);
    awal.setDate(awal.getDate() + i * 7);
    return { awal: awal.toISOString().slice(0, 10), konten: 0, aktivitas: 0 };
  });
  const indeks = (t) => Math.floor((AWAL_MINGGU(t) - mulai) / (7 * 86400000));
  semuaKonten.forEach((k) => {
    const i = indeks(k.createdAt);
    if (i >= 0 && i < 12) minggu[i].konten += 1;
  });
  aktivitas.forEach((a) => {
    const i = indeks(a.t);
    if (i >= 0 && i < 12) minggu[i].aktivitas += 1;
  });

  const kontenOf = new Map(semuaKonten.map((k) => [k.id, k]));
  const kelasOf = new Map(rows.map((r) => [r.id, r]));
  const denganKonten = rows.filter((r) => r.totalKonten > 0);
  return {
    tahunAjaranId: f.tahunAjaranId,
    ringkasan: {
      kelas: rows.length,
      kelasDenganKonten: denganKonten.length,
      konten: Object.fromEntries(JENIS.map((x) => [x.toLowerCase(), konten.filter((k) => k.jenis === x).length])),
      totalKonten: konten.length,
      draf: semuaKonten.length - konten.length,
      dosenAktif: new Set(semuaKonten.map((k) => k.dosenId)).size,
      mahasiswaAktif: aktifTotal,
      peserta: rows.reduce((s, r) => s + r.peserta, 0),
      penyelesaian: persen(selesai, penugasan),
      rataKuis: rataBerbobot('KUIS'),
      rataTugas: rataBerbobot('TUGAS'),
      tugasBelumDinilai: rows.reduce((s, r) => s + r.tugasBelumDinilai, 0),
      komentar: statList.reduce((s, { s: x }) => s + x.komentar, 0),
      suka: statList.reduce((s, { s: x }) => s + x.suka, 0),
    },
    tren: minggu,
    kelasTeraktif: [...denganKonten].sort((a, b) => (b.penyelesaian ?? -1) - (a.penyelesaian ?? -1) || b.mahasiswaAktif - a.mahasiswaAktif).slice(0, 5),
    kelasTanpaKonten: rows.filter((r) => !r.totalKonten).length,
    aktivitasTerbaru: terbaru.map((a) => {
      const k = kontenOf.get(Number(a.kontenId));
      const j = k ? kelasOf.get(k.jadwalKuliahId) : null;
      return {
        tipe: a.tipe,
        waktu: a.waktu,
        pelaku: a.pelaku,
        peran: a.peran,
        konten: k ? { id: k.id, judul: k.judul, jenis: k.jenis } : null,
        kelas: j ? { id: j.id, namaMataKuliah: j.namaMataKuliah, kelas: j.kelas } : null,
      };
    }),
  };
};

// ---------------------------------------------------------------- Kelas Online

const listKelas = async (query) => {
  const f = await resolveFilter(query);
  const { rows } = await rekapKelas(await daftarKelas(f));
  const status = query.status;
  return status === 'ADA' ? rows.filter((r) => r.totalKonten) : status === 'KOSONG' ? rows.filter((r) => !r.totalKonten) : rows;
};

/** Detail satu kelas: info, daftar konten (termasuk draf) + statistik, dan progres tiap peserta. */
const detailKelas = async (id) => {
  const [kelas] = await q(`${SQL_KELAS} WHERE j.id = :id`, { id });
  if (!kelas) throw new ApiError(404, 'Kelas tidak ditemukan');
  const [peserta, pengampuOf, semuaKonten] = await Promise.all([pesertaKelas(id), pengampuMap([Number(id)]), kontenDiKelas([Number(id)])]);
  const pesertaOf = new Map([[Number(id), peserta.length]]);
  const stat = await statKonten(semuaKonten, pesertaOf);
  const terbit = semuaKonten.filter((k) => k.isPublished);
  const ids = terbit.map((k) => k.id);
  const [daftar, lihat, progres, jawaban, tugas] = ids.length
    ? await Promise.all([
        q('SELECT konten_id AS k, mahasiswa_id AS m FROM elearning_konten_mahasiswa WHERE konten_id IN (:ids)', { ids }),
        q('SELECT konten_id AS k, mahasiswa_id AS m, jumlah, durasi_detik AS durasi, updated_at AS t FROM elearning_lihat WHERE konten_id IN (:ids)', { ids }),
        q('SELECT konten_id AS k, mahasiswa_id AS m, created_at AS t FROM elearning_progres WHERE konten_id IN (:ids)', { ids }),
        q('SELECT konten_id AS k, mahasiswa_id AS m, skor, created_at AS t FROM elearning_jawaban WHERE konten_id IN (:ids)', { ids }),
        q('SELECT konten_id AS k, mahasiswa_id AS m, nilai, created_at AS t FROM elearning_tugas_jawaban WHERE konten_id IN (:ids)', { ids }),
      ])
    : [[], [], [], [], []];
  const kunci = (r) => `${r.k}|${r.m}`;
  const daftarSet = new Set(daftar.map(kunci));
  const selesaiSet = new Set([...progres, ...jawaban, ...tugas].map(kunci));
  const progresPeserta = peserta.map((p) => {
    const ditugaskan = terbit.filter((k) => (BERDAFTAR.includes(k.target) ? daftarSet.has(`${k.id}|${p.id}`) : true));
    const skor = jawaban.filter((j) => Number(j.m) === p.id).map((j) => Number(j.skor));
    const nilai = tugas.filter((t) => Number(t.m) === p.id && t.nilai != null).map((t) => Number(t.nilai));
    const milikLihat = lihat.filter((l) => Number(l.m) === p.id);
    const waktu = [...milikLihat, ...progres, ...jawaban, ...tugas].filter((r) => Number(r.m) === p.id).map((r) => new Date(r.t).getTime());
    const selesai = ditugaskan.filter((k) => selesaiSet.has(`${k.id}|${p.id}`)).length;
    return {
      ...p,
      ditugaskan: ditugaskan.length,
      selesai,
      penyelesaian: persen(selesai, ditugaskan.length),
      rataKuis: skor.length ? round2(skor.reduce((s, v) => s + v, 0) / skor.length) : null,
      rataTugas: nilai.length ? round2(nilai.reduce((s, v) => s + v, 0) / nilai.length) : null,
      dilihat: milikLihat.reduce((s, l) => s + Number(l.jumlah), 0),
      durasi: milikLihat.reduce((s, l) => s + Number(l.durasi), 0),
      terakhirAktif: waktu.length ? new Date(Math.max(...waktu)) : null,
    };
  });
  return {
    kelas: { ...kelas, id: Number(kelas.id), tahunAjaran: labelTa(kelas), pengampu: pengampuOf.get(Number(id)) ?? [], peserta: peserta.length },
    konten: semuaKonten
      .sort((a, b) => (a.pertemuanKe ?? 99) - (b.pertemuanKe ?? 99) || new Date(a.createdAt) - new Date(b.createdAt))
      .map((k) => ({ ...k, ...stat.get(k.id) })),
    peserta: progresPeserta,
  };
};

// ---------------------------------------------------------------- Materi / Tugas / Kuis

const listKonten = async (query, jenis) => {
  const f = await resolveFilter(query);
  const kelas = await daftarKelas(f, false);
  const kelasOf = new Map(kelas.map((k) => [Number(k.id), k]));
  let konten = await kontenDiKelas([...kelasOf.keys()], jenis);
  if (query.jenis && jenis.includes(query.jenis)) konten = konten.filter((k) => k.jenis === query.jenis);
  if (query.status === 'TERBIT') konten = konten.filter((k) => k.isPublished);
  if (query.status === 'DRAF') konten = konten.filter((k) => !k.isPublished);
  if (f.search) {
    konten = konten.filter((k) => {
      const j = kelasOf.get(k.jadwalKuliahId);
      return [k.judul, k.namaDosen, j?.namaMataKuliah, j?.kodeMataKuliah, j?.kelas].some((v) => String(v ?? '').toLowerCase().includes(f.search));
    });
  }
  const stat = await statKonten(konten, await pesertaMap([...new Set(konten.map((k) => k.jadwalKuliahId))]));
  const sekarang = new Date();
  return konten.map((k) => {
    const j = kelasOf.get(k.jadwalKuliahId);
    return {
      ...k,
      ...stat.get(k.id),
      lewatTenggat: !!k.tenggat && new Date(k.tenggat) < sekarang,
      kelas: { id: Number(j.id), kelas: j.kelas, kodeMataKuliah: j.kodeMataKuliah, namaMataKuliah: j.namaMataKuliah, prodi: j.prodi, ikon: j.ikon ?? null },
    };
  });
};

/** Detail satu konten: info + status tiap penerima (dilihat, selesai/dikumpulkan, skor/nilai, terlambat). */
const detailKonten = async (id) => {
  const k = await ElearningKonten.findByPk(id, { attributes: { exclude: ['isi', 'lampiran'] } });
  if (!k) throw new ApiError(404, 'Konten tidak ditemukan');
  const [kelas] = await q(`${SQL_KELAS} WHERE j.id = :id`, { id: k.jadwalKuliahId });
  const [dosen] = await q(`SELECT ${NAMA_DOSEN} AS nama FROM dosen d WHERE d.id = :id`, { id: k.dosenId });
  const [peserta, daftar, lihat, progres, jawaban, tugas, [soal]] = await Promise.all([
    pesertaKelas(k.jadwalKuliahId),
    q('SELECT mahasiswa_id AS m, grup_nama AS grup FROM elearning_konten_mahasiswa WHERE konten_id = :id', { id: k.id }),
    q('SELECT mahasiswa_id AS m, jumlah, durasi_detik AS durasi, updated_at AS t FROM elearning_lihat WHERE konten_id = :id', { id: k.id }),
    q('SELECT mahasiswa_id AS m, created_at AS t FROM elearning_progres WHERE konten_id = :id', { id: k.id }),
    q('SELECT mahasiswa_id AS m, skor, benar, jumlah_soal AS jumlahSoal, created_at AS t FROM elearning_jawaban WHERE konten_id = :id', { id: k.id }),
    q('SELECT mahasiswa_id AS m, nilai, terlambat, dinilai_at AS dinilaiAt, created_at AS t FROM elearning_tugas_jawaban WHERE konten_id = :id', { id: k.id }),
    q('SELECT COUNT(*) AS n FROM elearning_soal WHERE konten_id = :id', { id: k.id }),
  ]);
  const cari = (rows, m) => rows.find((r) => Number(r.m) === m);
  // Penerima: peserta kelas (SEMUA / KAMPUS) atau yang dipilih dosen; ditambah mahasiswa lain yang sudah berinteraksi (target KAMPUS).
  let penerima = BERDAFTAR.includes(k.target) ? peserta.filter((p) => cari(daftar, p.id)) : [...peserta];
  const lain = [...new Set([...lihat, ...progres, ...jawaban, ...tugas].map((r) => Number(r.m)))].filter((m) => !penerima.some((p) => p.id === m));
  if (lain.length) penerima = penerima.concat(await q('SELECT id, nim, nama_lengkap AS nama FROM mahasiswa WHERE id IN (:ids)', { ids: lain }));
  const rows = penerima.map((p) => {
    const l = cari(lihat, p.id);
    const s = k.jenis === 'KUIS' ? cari(jawaban, p.id) : k.jenis === 'TUGAS' ? cari(tugas, p.id) : cari(progres, p.id);
    return {
      id: p.id,
      nim: p.nim,
      nama: p.nama,
      grup: cari(daftar, p.id)?.grup ?? null,
      dilihat: l ? Number(l.jumlah) : 0,
      durasi: l ? Number(l.durasi) : 0,
      terakhirDilihat: l?.t ?? null,
      selesaiAt: s?.t ?? null,
      skor: k.jenis === 'KUIS' && s ? Number(s.skor) : k.jenis === 'TUGAS' && s?.nilai != null ? Number(s.nilai) : null,
      benar: k.jenis === 'KUIS' && s ? `${s.benar}/${s.jumlahSoal}` : null,
      terlambat: k.jenis === 'TUGAS' && s ? !!Number(s.terlambat) : false,
    };
  });
  return {
    konten: { ...k.toJSON(), namaDosen: dosen?.nama ?? null, jumlahSoal: Number(soal?.n ?? 0) },
    kelas: kelas ? { id: Number(kelas.id), kelas: kelas.kelas, kodeMataKuliah: kelas.kodeMataKuliah, namaMataKuliah: kelas.namaMataKuliah, prodi: kelas.prodi, tahunAjaran: labelTa(kelas) } : null,
    rows: rows.sort((a, b) => String(a.nim).localeCompare(String(b.nim))),
  };
};

const setTerbit = async (id, isPublished) => {
  const k = await ElearningKonten.findByPk(id, { attributes: ['id', 'isPublished'] });
  if (!k) throw new ApiError(404, 'Konten tidak ditemukan');
  await k.update({ isPublished: !!isPublished });
  return { id: k.id, isPublished: k.isPublished };
};

// ---------------------------------------------------------------- Forum diskusi (komentar konten)

const forum = async (query) => {
  const f = await resolveFilter(query);
  const ids = (await daftarKelas(f, false)).map((k) => Number(k.id));
  if (!ids.length) return { ringkasan: { komentar: 0, pengirim: 0, konten: 0 }, rows: [] };
  const where = ['c.jadwal_kuliah_id IN (:ids)'];
  if (query.peran === 'DOSEN') where.push('km.dosen_id IS NOT NULL');
  if (query.peran === 'MAHASISWA') where.push('km.mahasiswa_id IS NOT NULL');
  if (f.search) where.push('(LOWER(km.isi) LIKE :s OR LOWER(c.judul) LIKE :s OR LOWER(m.nama_lengkap) LIKE :s OR LOWER(d.nama_lengkap) LIKE :s OR m.nim LIKE :s)');
  const rows = await q(
    `SELECT km.id, km.isi, km.created_at AS createdAt, km.dosen_id AS dosenId, km.mahasiswa_id AS mahasiswaId,
            ${NAMA_DOSEN} AS namaDosen, m.nama_lengkap AS namaMahasiswa, m.nim,
            c.id AS kontenId, c.judul, c.jenis, j.id AS jadwalKuliahId, j.nama_mata_kuliah AS namaMataKuliah, j.kode_mata_kuliah AS kodeMataKuliah, j.kelas
       FROM elearning_komentar km
       JOIN elearning_konten c ON c.id = km.konten_id
       JOIN jadwal_kuliah j ON j.id = c.jadwal_kuliah_id
       LEFT JOIN dosen d ON d.id = km.dosen_id
       LEFT JOIN mahasiswa m ON m.id = km.mahasiswa_id
      WHERE ${where.join(' AND ')}
      ORDER BY km.created_at DESC LIMIT 500`,
    { ids, s: `%${f.search}%` }
  );
  const hasil = rows.map((r) => ({
    id: Number(r.id),
    isi: r.isi,
    createdAt: r.createdAt,
    peran: r.mahasiswaId ? 'MAHASISWA' : 'DOSEN',
    nama: r.mahasiswaId ? r.namaMahasiswa : r.namaDosen,
    nim: r.nim ?? null,
    konten: { id: Number(r.kontenId), judul: r.judul, jenis: r.jenis },
    kelas: { id: Number(r.jadwalKuliahId), namaMataKuliah: r.namaMataKuliah, kodeMataKuliah: r.kodeMataKuliah, kelas: r.kelas },
  }));
  return {
    ringkasan: {
      komentar: hasil.length,
      pengirim: new Set(hasil.map((r) => `${r.peran}|${r.nama}`)).size,
      konten: new Set(hasil.map((r) => r.konten.id)).size,
    },
    rows: hasil,
  };
};

const hapusKomentar = async (id) => {
  const [ada] = await q('SELECT id FROM elearning_komentar WHERE id = :id', { id });
  if (!ada) throw new ApiError(404, 'Komentar tidak ditemukan');
  await sequelize.query('DELETE FROM elearning_komentar WHERE id = :id', { replacements: { id } });
};

// ---------------------------------------------------------------- Laporan aktivitas

const laporan = async (query) => {
  const f = await resolveFilter(query);
  const { rows } = await rekapKelas(await daftarKelas(f));
  const perProdi = new Map();
  rows.forEach((r) => {
    const key = r.kodeProdi ?? '-';
    const p = perProdi.get(key) ?? { kodeProdi: r.kodeProdi, prodi: r.prodi ?? 'Tanpa prodi', kelas: 0, kelasDenganKonten: 0, konten: 0, peserta: 0, mahasiswaAktif: 0, penugasan: 0, selesai: 0, tugasBelumDinilai: 0 };
    p.kelas += 1;
    p.kelasDenganKonten += r.totalKonten ? 1 : 0;
    p.konten += r.totalKonten;
    p.peserta += r.peserta;
    p.mahasiswaAktif += r.mahasiswaAktif;
    p.penugasan += r.penugasan;
    p.selesai += r.selesai;
    p.tugasBelumDinilai += r.tugasBelumDinilai;
    perProdi.set(key, p);
  });
  return {
    tahunAjaranId: f.tahunAjaranId,
    perProdi: [...perProdi.values()]
      .map((p) => ({ ...p, keaktifan: persen(Math.min(p.mahasiswaAktif, p.peserta), p.peserta), penyelesaian: persen(p.selesai, p.penugasan) }))
      .sort((a, b) => String(a.prodi).localeCompare(String(b.prodi))),
    perKelas: rows,
  };
};

const exportLaporan = async (query) => {
  const data = await laporan(query);
  const [ta] = data.tahunAjaranId ? await q('SELECT nama AS tahunAjaran, jenis_semester AS jenisSemester FROM tahun_ajaran WHERE id = :id', { id: data.tahunAjaranId }) : [];
  const wb = new ExcelJS.Workbook();
  const sheet = (nama, judul, kolom, baris) => {
    const ws = wb.addWorksheet(nama);
    ws.addRow([judul]).font = { bold: true, size: 13 };
    ws.addRow([`Tahun akademik: ${labelTa(ta) ?? '-'}`]);
    ws.addRow([]);
    const head = ws.addRow(kolom.map((c) => c.header));
    head.font = { bold: true };
    head.eachCell((c) => {
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFE6CF' } };
    });
    baris.forEach((r) => ws.addRow(kolom.map((c) => r[c.key] ?? '')));
    kolom.forEach((c, i) => (ws.getColumn(i + 1).width = c.width ?? 14));
  };
  sheet(
    'Per Prodi',
    'Laporan Aktivitas LMS per Prodi',
    [
      { header: 'Prodi', key: 'prodi', width: 34 },
      { header: 'Kelas', key: 'kelas' },
      { header: 'Kelas Berkonten', key: 'kelasDenganKonten', width: 16 },
      { header: 'Konten Terbit', key: 'konten' },
      { header: 'Peserta', key: 'peserta' },
      { header: 'Mahasiswa Aktif', key: 'mahasiswaAktif', width: 16 },
      { header: 'Keaktifan (%)', key: 'keaktifan' },
      { header: 'Penyelesaian (%)', key: 'penyelesaian', width: 16 },
      { header: 'Tugas Belum Dinilai', key: 'tugasBelumDinilai', width: 18 },
    ],
    data.perProdi
  );
  sheet(
    'Per Kelas',
    'Laporan Aktivitas LMS per Kelas',
    [
      { header: 'Prodi', key: 'prodi', width: 30 },
      { header: 'Kode MK', key: 'kodeMataKuliah' },
      { header: 'Mata Kuliah', key: 'namaMataKuliah', width: 36 },
      { header: 'Kelas', key: 'kelas', width: 10 },
      { header: 'Dosen', key: 'dosen', width: 30 },
      { header: 'Peserta', key: 'peserta', width: 10 },
      { header: 'Materi', key: 'materi', width: 10 },
      { header: 'Video', key: 'video', width: 10 },
      { header: 'Kuis', key: 'kuis', width: 10 },
      { header: 'Tugas', key: 'tugas', width: 10 },
      { header: 'Mahasiswa Aktif', key: 'mahasiswaAktif', width: 16 },
      { header: 'Keaktifan (%)', key: 'keaktifan' },
      { header: 'Penyelesaian (%)', key: 'penyelesaian', width: 16 },
      { header: 'Rata Kuis', key: 'rataKuis', width: 11 },
      { header: 'Rata Tugas', key: 'rataTugas', width: 11 },
      { header: 'Tugas Belum Dinilai', key: 'tugasBelumDinilai', width: 18 },
    ],
    data.perKelas.map((r) => ({ ...r, ...r.jumlah }))
  );
  return wb;
};

module.exports = { opsi, dashboard, listKelas, detailKelas, listKonten, detailKonten, setTerbit, forum, hapusKomentar, laporan, exportLaporan };
