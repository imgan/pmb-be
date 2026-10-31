const { JadwalKuliah, JadwalUjian, Dosen, KuesionerDosenKelas, EdomJawaban, AngketDosenJawaban, User, sequelize } = require('../models');
const ApiError = require('../utils/ApiError');
const jadwalUjianService = require('./jadwalUjian.service');
const { rekapKehadiranJadwal } = require('./dosenKelas.service');

/**
 * Menu halaman detail kelas (Prodi → Kelas Kuliah & portal Dosen → Kelas Kuliah): Jadwal Ujian (tabel
 * jadwal_ujian yang sama dengan menu Jadwal Ujian Prodi/Dosen), Presensi Kelas (matriks peserta × pertemuan)
 * dan Rekap Kuesioner dosen (EDOM). Akses kelas dicek di route (scope prodi / kelas yang diampu dosen).
 */
const namaDosen = (d) => (d ? [d.namaLengkap, d.gelar].filter(Boolean).join(', ') : null);
const round2 = (v) => Math.round(Number(v) * 100) / 100;

const muatJadwal = async (jadwalKuliahId) => {
  const j = await JadwalKuliah.findByPk(jadwalKuliahId, {
    include: [
      { model: Dosen.unscoped(), as: 'dosenKordinator', attributes: ['id', 'nidn', 'namaLengkap', 'gelar'], required: false },
      { model: Dosen.unscoped(), as: 'dosenPengampu', attributes: ['id', 'nidn', 'namaLengkap', 'gelar'], through: { attributes: [] }, required: false },
    ],
  });
  if (!j) throw new ApiError(404, 'Kelas kuliah tidak ditemukan');
  return j;
};
/** Kordinator + pengampu (unik, kordinator dulu). */
const timDosen = (j) => [j.dosenKordinator, ...(j.dosenPengampu ?? [])].filter((d, i, arr) => d && arr.findIndex((x) => x?.id === d.id) === i);

// ---------- Jadwal Ujian ----------
/** UTS & UAS kelas: isian (status, sifat, tanggal) + ruangan, jam ke-, pengawas (mengikuti jadwal kuliah). */
const jadwalUjianKelas = async (jadwalKuliahId) => {
  const j = await muatJadwal(jadwalKuliahId);
  const ujian = await JadwalUjian.findAll({ where: { jadwalKuliahId: j.id } });
  const pengisi = ujian.length
    ? await Promise.all([
        User.findAll({ where: { id: ujian.map((u) => u.updatedBy).filter(Boolean) }, attributes: ['id', 'name'], raw: true }),
        Dosen.unscoped().findAll({ where: { id: ujian.map((u) => u.updatedByDosenId).filter(Boolean) }, attributes: ['id', 'namaLengkap', 'gelar'] }),
      ])
    : [[], []];
  const pengawas = timDosen(j).map(namaDosen).join('; ');
  return {
    sifatOptions: jadwalUjianService.SIFAT_UJIAN,
    ujian: ['UTS', 'UAS'].map((jenisUjian) => {
      const u = ujian.find((x) => x.jenisUjian === jenisUjian);
      const user = u?.updatedBy ? pengisi[0].find((x) => x.id === u.updatedBy) : null;
      const dosen = u?.updatedByDosenId ? pengisi[1].find((x) => x.id === u.updatedByDosenId) : null;
      return {
        jenisUjian,
        status: u?.status ?? null,
        sifat: u?.sifat ?? null,
        tanggal: u?.tanggal ?? null,
        ruangan: j.ruangan,
        jamKe: j.jam,
        pengawas,
        diubahOleh: user?.name ?? namaDosen(dosen) ?? null,
        diubahPada: u?.updatedAt ?? null,
      };
    }),
  };
};

/** Simpan isian ujian (service yang sama dengan menu Jadwal Ujian → data tersinkron). */
const simpanJadwalUjianKelas = async (jadwalKuliahId, payload, pengisi) => {
  await jadwalUjianService.simpanJadwalUjian(jadwalKuliahId, payload, null, pengisi);
  return jadwalUjianKelas(jadwalKuliahId);
};

// ---------- Presensi Kelas ----------
const presensiKelas = async (jadwalKuliahId) => {
  const j = await muatJadwal(jadwalKuliahId);
  const r = await rekapKehadiranJadwal(j);
  const total = { HADIR: 0, IZIN: 0, SAKIT: 0, ALPA: 0 };
  r.mahasiswa.forEach((m) => {
    total.HADIR += m.hadir;
    total.IZIN += m.izin;
    total.SAKIT += m.sakit;
    total.ALPA += m.alpa;
  });
  const slot = r.mahasiswa.length * r.pertemuan.length;
  return {
    pertemuan: r.pertemuan,
    mahasiswa: r.mahasiswa,
    ringkasan: { jumlahPertemuan: r.pertemuan.length, jumlahMahasiswa: r.mahasiswa.length, ...total, persenHadir: slot ? round2((total.HADIR / slot) * 100) : 0 },
  };
};

// ---------- Rekap Kuesioner (EDOM) ----------
/**
 * Rekap angket dosen (EDOM) kelas per dosen yang dinilai: jumlah responden vs peserta, rata-rata nilai per
 * pertanyaan & keseluruhan, distribusi jawaban, serta jawaban terbuka & saran (anonim). `dosenId` membatasi
 * ke satu dosen (portal Dosen hanya melihat rekap dirinya).
 */
const rekapKuesioner = async (jadwalKuliahId, { dosenId = null } = {}) => {
  const j = await muatJadwal(jadwalKuliahId);
  const [jawaban, pilihan, setel, peserta] = await Promise.all([
    EdomJawaban.findAll({ where: { jadwalKuliahId: j.id, ...(dosenId ? { dosenId } : {}) } }),
    AngketDosenJawaban.findAll({ order: [['nilai', 'DESC']], attributes: ['jawaban', 'nilai'], raw: true }),
    KuesionerDosenKelas.findAll({ where: { jadwalKuliahId: j.id }, attributes: ['dosenId', 'isiKuesioner'], raw: true }),
    sequelize.query(
      `SELECT COUNT(*) AS n FROM krs_detail d JOIN krs k ON k.id = d.krs_id AND k.status = 'DISETUJUI' WHERE d.jadwal_kuliah_id = :id`,
      { replacements: { id: j.id }, type: sequelize.QueryTypes.SELECT }
    ),
  ]);
  const skalaMaks = pilihan.length ? Math.max(...pilihan.map((p) => p.nilai)) : null;
  const dinilai = (d) => setel.find((s) => s.dosenId === d.id)?.isiKuesioner ?? true;
  const daftarDosen = timDosen(j).filter((d) => !dosenId || d.id === Number(dosenId));

  const dosen = daftarDosen.map((d) => {
    const isian = jawaban.filter((x) => x.dosenId === d.id);
    // Rekap per pertanyaan (snapshot jawaban mahasiswa; urutan pertama kali muncul).
    const perPertanyaan = new Map();
    const terbuka = [];
    isian.forEach((x) =>
      (x.jawaban ?? []).forEach((q) => {
        if (q.openQuestion) {
          if (q.teks && String(q.teks).trim()) terbuka.push({ pertanyaan: q.pertanyaan, teks: String(q.teks).trim() });
          return;
        }
        const key = String(q.pertanyaanId ?? q.pertanyaan);
        if (!perPertanyaan.has(key)) perPertanyaan.set(key, { pertanyaan: q.pertanyaan, nilai: [], distribusi: {} });
        const e = perPertanyaan.get(key);
        if (q.nilai !== null && q.nilai !== undefined) {
          e.nilai.push(Number(q.nilai));
          e.distribusi[q.nilai] = (e.distribusi[q.nilai] ?? 0) + 1;
        }
      })
    );
    const pertanyaan = [...perPertanyaan.values()].map((e) => ({
      pertanyaan: e.pertanyaan,
      jumlah: e.nilai.length,
      rataRata: e.nilai.length ? round2(e.nilai.reduce((s, v) => s + v, 0) / e.nilai.length) : null,
      distribusi: e.distribusi,
    }));
    const semuaNilai = pertanyaan.filter((p) => p.rataRata !== null);
    const rataRata = semuaNilai.length ? round2(semuaNilai.reduce((s, p) => s + p.rataRata, 0) / semuaNilai.length) : null;
    return {
      id: d.id,
      nidn: d.nidn,
      nama: namaDosen(d),
      peran: d.id === j.dosenKordinatorId ? 'Koordinator' : 'Pengampu',
      dinilai: dinilai(d),
      responden: isian.length,
      rataRata,
      persen: rataRata !== null && skalaMaks ? round2((rataRata / skalaMaks) * 100) : null,
      pertanyaan,
      terbuka,
      saran: isian.map((x) => x.saran).filter((s) => s && String(s).trim()),
    };
  });
  return { peserta: Number(peserta[0]?.n ?? 0), skala: pilihan, skalaMaks, dosen };
};

module.exports = { jadwalUjianKelas, simpanJadwalUjianKelas, presensiKelas, rekapKuesioner };
