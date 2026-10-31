const { Op } = require('sequelize');
const {
  sequelize,
  JadwalKuliah,
  JadwalKuliahDosenPengampu,
  Dosen,
  TahunAjaran,
  MataKuliah,
  Kurikulum,
  Jurusan,
  KrsDetail,
  Krs,
  Mahasiswa,
  GolonganKelas,
  Ruangan,
  BobotObe,
  Cpmk,
  RpsEvaluasi,
  RpsEvaluasiCpmk,
  RpsPertemuan,
  KehadiranDosen,
} = require('../models');
const ApiError = require('../utils/ApiError');
const { formatTahunAjaran } = require('../utils/tahunAjaran');
const { jadwalIdsForProdi, kodeProdiJadwal } = require('../utils/prodiJadwal');
const bobotObeService = require('./bobotObe.service');

/**
 * Prodi → Perkuliahan → Kelas Kuliah: daftar kelas (jadwal kuliah) per tahun akademik dan detail kelas
 * (info, dosen pengajar, peserta, Nilai Perkuliahan → Komposisi Nilai Kelas). Komposisi nilai disimpan di
 * bobot_obe (sama dengan Bobot OBE portal dosen) beserta rincian sub metode & nilai per CPMK; usulan
 * komposisi diambil dari Rencana Evaluasi RPS mata kuliahnya (periode "berlaku sejak" ≤ periode kelas).
 * Data dibatasi prodi sesi lewat `jurusanId` (prodiScope).
 */

const round2 = (v) => Math.round(Number(v) * 100) / 100;
const namaDosen = (d) => (d ? [d.namaLengkap, d.gelar].filter(Boolean).join(', ') : null);
const urutTa = (t) => (t?.tahunMulai ?? 0) * 10 + (t?.jenisSemester === 'GENAP' ? 2 : 1);

/** Id jadwal yang boleh diakses (scope prodi sesi); null = semua. */
const jadwalScope = async (jurusanId) => {
  if (!jurusanId) return null;
  const kode = [...new Set((await Jurusan.findAll({ where: { id: [].concat(jurusanId).map(Number) }, attributes: ['kodeProdi'], raw: true })).map((j) => j.kodeProdi).filter(Boolean))];
  const ids = (await Promise.all(kode.map((k) => jadwalIdsForProdi(k)))).flat();
  return new Set(ids);
};

const includeMk = {
  model: MataKuliah.unscoped(),
  as: 'mataKuliah',
  required: false,
  attributes: ['id', 'kode', 'mataKuliah', 'isObe', 'levelPemetaanCpmk', 'semester'],
  include: [
    {
      model: Kurikulum.unscoped(),
      as: 'kurikulum',
      required: false,
      attributes: ['id', 'nama', 'tahunKurikulum', 'jurusanId'],
      include: [{ model: Jurusan, as: 'jurusan', required: false, attributes: ['id', 'namaJurusan', 'kodeProdi', 'jenjangPendidikan'] }],
    },
  ],
};

/** Jumlah peserta (KRS disetujui) per jadwal. */
const hitungPeserta = async (ids) => {
  if (!ids.length) return new Map();
  const rows = await sequelize.query(
    `SELECT d.jadwal_kuliah_id AS id, COUNT(*) AS n FROM krs_detail d JOIN krs k ON k.id = d.krs_id AND k.status = 'DISETUJUI'
      WHERE d.jadwal_kuliah_id IN (:ids) GROUP BY d.jadwal_kuliah_id`,
    { replacements: { ids }, type: sequelize.QueryTypes.SELECT }
  );
  return new Map(rows.map((r) => [Number(r.id), Number(r.n)]));
};

const list = async (query = {}) => {
  const where = {};
  if (query.tahunAjaranId) where.tahunAjaranId = Number(query.tahunAjaranId);
  if (query.search) {
    const like = { [Op.like]: `%${query.search}%` };
    where[Op.or] = [{ kelas: like }, { kodeMataKuliah: like }, { namaMataKuliah: like }];
  }
  const scope = await jadwalScope(query.jurusanId);
  if (scope) where.id = [...scope];
  const rows = await JadwalKuliah.findAll({
    where,
    attributes: ['id', 'kelas', 'kodeMataKuliah', 'namaMataKuliah', 'sks', 'semester', 'tahunAjaranId', 'mataKuliahId', 'ruangan'],
    include: [
      includeMk,
      { model: Dosen.unscoped(), as: 'dosenKordinator', attributes: ['namaLengkap', 'gelar'], required: false },
      { model: TahunAjaran, as: 'tahunAjaran', attributes: ['id', 'nama', 'jenisSemester'], required: false },
    ],
    order: [['kodeMataKuliah', 'ASC'], ['kelas', 'ASC']],
  });
  const ids = rows.map((r) => r.id);
  const [peserta, bobot] = await Promise.all([
    hitungPeserta(ids),
    ids.length ? BobotObe.findAll({ where: { jadwalKuliahId: ids }, attributes: ['jadwalKuliahId'], raw: true }) : [],
  ]);
  const terisi = new Set(bobot.map((b) => b.jadwalKuliahId));
  return rows.map((j) => ({
    id: j.id,
    kelas: j.kelas,
    kodeMataKuliah: j.kodeMataKuliah,
    namaMataKuliah: j.namaMataKuliah,
    sks: j.sks,
    semester: j.semester,
    tahunAjaran: formatTahunAjaran(j.tahunAjaran),
    prodi: j.mataKuliah?.kurikulum?.jurusan?.namaJurusan ?? null,
    tahunKurikulum: j.mataKuliah?.kurikulum?.tahunKurikulum ?? null,
    isObe: !!j.mataKuliah?.isObe,
    dosen: namaDosen(j.dosenKordinator),
    peserta: peserta.get(j.id) ?? 0,
    komposisiTerisi: terisi.has(j.id),
  }));
};

const findJadwal = async (id, jurusanId) => {
  const j = await JadwalKuliah.findByPk(id, {
    include: [
      includeMk,
      { model: Dosen.unscoped(), as: 'dosenKordinator', attributes: ['id', 'nidn', 'namaLengkap', 'gelar'], required: false },
      { model: TahunAjaran, as: 'tahunAjaran', attributes: ['id', 'nama', 'jenisSemester', 'tahunMulai'], required: false },
    ],
  });
  if (!j) throw new ApiError(404, 'Kelas kuliah tidak ditemukan');
  const scope = await jadwalScope(jurusanId);
  if (scope && !scope.has(j.id)) throw new ApiError(403, 'Kelas kuliah ini bukan milik prodi Anda');
  return j;
};

// ---------- Usulan komposisi dari RPS ----------
const METODE_RPS = {
  TUGAS_INDIVIDU: ['Tugas Individu', 'tugas'],
  TUGAS_KELOMPOK: ['Tugas Kelompok', 'tugas'],
  KUIS: ['Quiz', 'quiz'],
  UTS: ['UTS', 'uts'],
  UAS: ['UAS', 'uas'],
  PRAKTIKUM: ['Praktikum', 'tugas'],
  PROYEK: ['Proyek', 'proyek'],
  PRESENTASI: ['Presentasi', 'tugas'],
  PARTISIPASI: ['Aktivitas Partisipatif', 'partisipatif'],
  LAINNYA: ['Lainnya', 'tugas'],
};

/**
 * Rencana Evaluasi RPS yang berlaku untuk kelas: periode RPS terbaru yang ≤ periode kelas (bila tidak ada,
 * periode RPS paling awal), lalu dipetakan ke format komponenEvaluasi bobot_obe.
 */
const komposisiDariRps = async (mataKuliahId, tahunAjaran) => {
  if (!mataKuliahId) return { periode: null, komponenEvaluasi: [] };
  const periode = await sequelize.query(
    `SELECT DISTINCT t.id, t.nama, t.jenis_semester AS jenisSemester, t.tahun_mulai AS tahunMulai
       FROM rps_evaluasi e JOIN tahun_ajaran t ON t.id = e.tahun_ajaran_id WHERE e.mata_kuliah_id = :mk`,
    { replacements: { mk: mataKuliahId }, type: sequelize.QueryTypes.SELECT }
  );
  if (!periode.length) return { periode: null, komponenEvaluasi: [] };
  const urut = periode.sort((a, b) => urutTa(b) - urutTa(a));
  const pilih = urut.find((p) => !tahunAjaran || urutTa(p) <= urutTa(tahunAjaran)) ?? urut[urut.length - 1];
  const evaluasi = await RpsEvaluasi.findAll({
    where: { mataKuliahId, tahunAjaranId: pilih.id },
    order: [['urutan', 'ASC'], ['id', 'ASC']],
  });
  const sel = await RpsEvaluasiCpmk.findAll({ where: { rpsEvaluasiId: evaluasi.map((e) => e.id) } });
  const cpmkOf = (id) => Object.fromEntries(sel.filter((c) => c.rpsEvaluasiId === id).map((c) => [String(c.cpmkId), c.bobot]));
  const sum = (o) => Object.values(o).reduce((s, v) => s + Number(v), 0);
  const komponenEvaluasi = evaluasi
    .filter((e) => !e.parentId)
    .map((e) => {
      const [metode, jenis] = METODE_RPS[e.metode] ?? ['Lainnya', 'tugas'];
      const subs = evaluasi.filter((x) => x.parentId === e.id);
      const row = { metode, jenis, bobot: e.bobot, syaratLulus: jenis === 'uts' || jenis === 'uas' };
      if (!subs.length) return { ...row, cpmk: cpmkOf(e.id) };
      // Bobot sub = Σ nilai CPMK sub ÷ bobot metode (dibagi rata bila nilai CPMK belum diisi); sisa ke sub terakhir.
      let sisa = 100;
      const sub = subs.map((s, i) => {
        const cpmk = cpmkOf(s.id);
        const bobot = i === subs.length - 1 ? round2(sisa) : round2(e.bobot ? (sum(cpmk) / e.bobot) * 100 || 100 / subs.length : 100 / subs.length);
        sisa -= bobot;
        return { nama: s.jenisEvaluasi || `${metode} ${i + 1}`, bobot, cpmk };
      });
      return { ...row, sub };
    });
  // Waktu Rencana Evaluasi terakhir diubah — dipakai untuk memilih dokumen terbaru (RPS vs komposisi kelas).
  const diperbarui = [...evaluasi, ...sel].reduce((t, r) => (r.updatedAt > t ? r.updatedAt : t), new Date(0));
  return { periode: { id: pilih.id, nama: formatTahunAjaran(pilih) }, komponenEvaluasi, diperbarui };
};

/** Detail kelas: info, dosen pengajar, peserta, komposisi nilai + kolom CPMK + usulan dari RPS. */
const detail = async (id, jurusanId) => {
  const j = await findJadwal(id, jurusanId);
  const mk = j.mataKuliah;
  const [pengampu, krs, ruang, komposisi, cpmk, rps] = await Promise.all([
    JadwalKuliahDosenPengampu.findAll({ where: { jadwalKuliahId: j.id }, raw: true }),
    KrsDetail.findAll({
      where: { jadwalKuliahId: j.id },
      include: [
        {
          model: Krs,
          as: 'krs',
          required: true,
          attributes: ['id', 'status', 'semester'],
          include: [
            {
              model: Mahasiswa.unscoped(),
              as: 'mahasiswa',
              attributes: ['id', 'nim', 'namaLengkap'],
              include: [{ model: GolonganKelas, as: 'golonganKelas', attributes: ['namaKelas'], required: false }],
            },
          ],
        },
      ],
    }),
    j.ruangan ? Ruangan.findOne({ where: { namaRuang: j.ruangan }, attributes: ['kursi'] }) : null,
    bobotObeService.getBobot(j.id),
    mk ? Cpmk.findAll({ where: { mataKuliahId: mk.id }, order: [['kode', 'ASC'], ['id', 'ASC']] }) : [],
    komposisiDariRps(mk?.id, j.tahunAjaran),
  ]);
  const dosenPengampu = pengampu.length ? await Dosen.unscoped().findAll({ where: { id: pengampu.map((p) => p.dosenId) }, attributes: ['id', 'nidn', 'namaLengkap', 'gelar'] }) : [];
  const peserta = krs
    .map((d) => ({
      mahasiswaId: d.krs.mahasiswa?.id,
      nim: d.krs.mahasiswa?.nim,
      nama: d.krs.mahasiswa?.namaLengkap,
      golongan: d.krs.mahasiswa?.golonganKelas?.namaKelas ?? null,
      semester: d.krs.semester,
      statusKrs: d.krs.status,
    }))
    .sort((a, b) => String(a.nim).localeCompare(String(b.nim)));
  const disetujui = peserta.filter((p) => p.statusKrs === 'DISETUJUI');
  // Sistem kuliah = golongan kelas terbanyak di antara peserta.
  const hitungGol = new Map();
  disetujui.forEach((p) => p.golongan && hitungGol.set(p.golongan, (hitungGol.get(p.golongan) ?? 0) + 1));
  const sistemKuliah = [...hitungGol.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  // Kolom CPMK sesuai level Pemetaan CPMK MK (CPMK induk / Sub-CPMK).
  const induk = cpmk.filter((c) => !c.parentId);
  const kolomCpmk =
    mk?.levelPemetaanCpmk === 'SUB_CPMK'
      ? induk.flatMap((c) => {
          const sub = cpmk.filter((x) => x.parentId === c.id);
          return sub.length ? sub : [c];
        })
      : induk;
  const k = mk?.kurikulum;
  return {
    kelas: {
      id: j.id,
      kelas: j.kelas,
      kodeMataKuliah: j.kodeMataKuliah,
      namaMataKuliah: j.namaMataKuliah,
      sks: j.sks,
      sksTeori: j.sksTeori,
      sksPraktik: j.sksPraktik,
      sksLab: j.sksLab,
      semester: j.semester,
      hari: j.hari,
      jam: j.jam,
      ruangan: j.ruangan,
      kapasitas: ruang?.kursi ?? null,
      gcr: j.gcr,
      tahunAjaranId: j.tahunAjaranId,
      periode: formatTahunAjaran(j.tahunAjaran),
      mataKuliahId: mk?.id ?? null,
      isObe: !!mk?.isObe,
      prodi: k?.jurusan?.namaJurusan ?? null,
      kodeProdi: kodeProdiJadwal(j),
      kurikulum: k?.tahunKurikulum ?? null,
      sistemKuliah,
      peserta: disetujui.length,
    },
    dosenKoordinator: j.dosenKordinator ? { id: j.dosenKordinator.id, nidn: j.dosenKordinator.nidn, nama: namaDosen(j.dosenKordinator) } : null,
    dosenPengampu: dosenPengampu.map((d) => ({ id: d.id, nidn: d.nidn, nama: namaDosen(d), sks: pengampu.find((p) => p.dosenId === d.id)?.sks ?? null })),
    peserta,
    komposisi,
    kolomCpmk: kolomCpmk.map((c) => ({ id: c.id, kode: c.kode, deskripsi: c.deskripsi })),
    rps,
  };
};

/** Simpan komposisi nilai kelas (bobot_obe); nilai mahasiswa yang sudah ada dihitung ulang. */
/** Pengaturan bobot komposisi nilai hanya untuk kelas yang mata kuliahnya OBE. */
const pastikanObe = (j) => {
  if (!j.mataKuliah?.isObe) throw new ApiError(400, 'Pengaturan bobot komposisi nilai hanya untuk kelas OBE');
};

const simpanKomposisi = async (id, payload, userId, jurusanId) => {
  const j = await findJadwal(id, jurusanId);
  pastikanObe(j);
  return bobotObeService.simpanBobot(j.id, payload, { userId });
};

const hapusKomposisi = async (id, jurusanId) => {
  const j = await findJadwal(id, jurusanId);
  pastikanObe(j);
  await bobotObeService.hapusBobot(j.id);
};

const teksBiasa = (html) =>
  String(html ?? '')
    .replace(/<\/(p|div|li|h\d)>|<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{2,}/g, '\n')
    .trim();

const JENIS_PERTEMUAN = { KULIAH: 'Kuliah', PRAKTIKUM: 'Praktikum', UTS: 'UTS', UAS: 'UAS', LAINNYA: 'Lainnya' };

/**
 * Jadwal Perkuliahan kelas: daftar pertemuan 1..N — rencana dari RPS Pertemuan mata kuliahnya (periode RPS
 * terbaru ≤ periode kelas) dibandingkan realisasi mengajar dosen (kehadiran_dosen) beserta rekap presensi
 * mahasiswa per pertemuan. Realisasi tanpa nomor pertemuan diberi nomor urut sesuai tanggal.
 */
const jadwalPerkuliahan = async (id, jurusanId) => {
  const j = await findJadwal(id, jurusanId);
  const mkId = j.mataKuliah?.id ?? null;

  let periodeRps = null;
  let rencana = [];
  if (mkId) {
    const periode = await sequelize.query(
      `SELECT DISTINCT t.id, t.nama, t.jenis_semester AS jenisSemester, t.tahun_mulai AS tahunMulai
         FROM rps_pertemuan r JOIN tahun_ajaran t ON t.id = r.tahun_ajaran_id WHERE r.mata_kuliah_id = :mk`,
      { replacements: { mk: mkId }, type: sequelize.QueryTypes.SELECT }
    );
    if (periode.length) {
      const urut = periode.sort((a, b) => urutTa(b) - urutTa(a));
      const pilih = urut.find((p) => !j.tahunAjaran || urutTa(p) <= urutTa(j.tahunAjaran)) ?? urut[urut.length - 1];
      periodeRps = { id: pilih.id, nama: formatTahunAjaran(pilih) };
      rencana = await RpsPertemuan.findAll({ where: { mataKuliahId: mkId, tahunAjaranId: pilih.id }, order: [['sesi', 'ASC'], ['id', 'ASC']] });
    }
  }

  const realisasi = await KehadiranDosen.findAll({
    where: { jadwalKuliahId: j.id },
    include: [{ model: Dosen.unscoped(), as: 'dosen', attributes: ['id', 'nidn', 'namaLengkap', 'gelar'], required: false }],
    order: [['tanggalRealisasi', 'ASC'], ['jamMasuk', 'ASC'], ['id', 'ASC']],
  });
  const presensi = realisasi.length
    ? await sequelize.query(
        `SELECT kehadiran_dosen_id AS id, status, COUNT(*) AS n FROM kehadiran_mahasiswa
          WHERE kehadiran_dosen_id IN (:ids) GROUP BY kehadiran_dosen_id, status`,
        { replacements: { ids: realisasi.map((r) => r.id) }, type: sequelize.QueryTypes.SELECT }
      )
    : [];
  const rekapOf = (rid) => {
    const r = { HADIR: 0, IZIN: 0, SAKIT: 0, ALPA: 0 };
    presensi.filter((p) => Number(p.id) === rid).forEach((p) => (r[p.status] = Number(p.n)));
    return r;
  };
  const jam = (t) => (t ? String(t).slice(0, 5) : null);
  const terpakai = new Set(realisasi.map((r) => r.pertemuanKe).filter(Boolean));
  let urutan = 0;
  const realisasiRows = realisasi.map((r) => {
    let ke = r.pertemuanKe;
    if (!ke) {
      do urutan += 1;
      while (terpakai.has(urutan));
      ke = urutan;
      terpakai.add(ke);
    }
    return {
      id: r.id,
      pertemuanKe: ke,
      tanggal: r.tanggalRealisasi,
      jamMasuk: jam(r.jamMasuk),
      jamKeluar: jam(r.jamKeluar),
      status: r.status,
      dosen: namaDosen(r.dosen),
      uraian: r.uraian || null,
      keterangan: r.keterangan || null,
      presensi: rekapOf(r.id),
    };
  });

  const jumlah = Math.max(16, ...rencana.map((r) => r.sesi), ...realisasiRows.map((r) => r.pertemuanKe));
  const pertemuan = Array.from({ length: jumlah }, (_, i) => {
    const ke = i + 1;
    const rp = rencana.filter((r) => r.sesi === ke);
    return {
      pertemuanKe: ke,
      rencana: rp.length
        ? {
            jenis: JENIS_PERTEMUAN[rp[0].jenisPertemuan] ?? rp[0].jenisPertemuan,
            // Materi RPS disimpan sebagai HTML (rich text) → teks biasa.
            materi: rp.map((r) => teksBiasa(r.materi)).filter(Boolean).join('\n'),
            metode: rp.map((r) => r.metodePembelajaran).filter(Boolean).join('; ') || null,
            // Bentuk pembelajaran sesi (LURING / DARING / HYBRID).
            bentuk: rp.find((r) => r.bentukPembelajaran)?.bentukPembelajaran ?? null,
            waktu: rp[0].waktu || null,
          }
        : null,
      realisasi: realisasiRows.filter((r) => r.pertemuanKe === ke),
    };
  });
  const terlaksana = pertemuan.filter((p) => p.realisasi.some((r) => r.status === 'HADIR')).length;
  return {
    periodeRps,
    ringkasan: { jumlahPertemuan: jumlah, terlaksana, persentase: jumlah ? Math.round((terlaksana / jumlah) * 100) : 0, jumlahRealisasi: realisasiRows.length },
    pertemuan,
  };
};

module.exports = { findJadwal, komposisiDariRps, list, detail, jadwalPerkuliahan, simpanKomposisi, hapusKomposisi };
