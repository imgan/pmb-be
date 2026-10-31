const { Op } = require('sequelize');
const { sequelize, BobotObe, JadwalKuliah, Dosen, User, TahunAjaran, NilaiMahasiswa, KrsDetail, Krs } = require('../models');
const ApiError = require('../utils/ApiError');
const { gradeFor } = require('../utils/gradeScale');
const { formatTahunAjaran } = require('../utils/tahunAjaran');
const { getPagination, getPagingMeta } = require('../utils/pagination');
const { kodeProdiJadwal } = require('../utils/prodiJadwal');

/**
 * Bobot OBE per jadwal kuliah: persentase tiap komponen nilai (total 100%). Wajib diisi dosen
 * sebelum menyimpan nilai kelas; prodi boleh mengubah/menghapus. Setiap perubahan bobot menghitung
 * ulang nilai akhir & huruf mahasiswa kelas tsb yang sudah punya nilai.
 */

const KOMPONEN_OBE = ['partisipatif', 'tugas', 'quiz', 'proyek', 'uts', 'uas'];
const round2 = (v) => Math.round(v * 100) / 100;

const totalBobot = (b) => round2(KOMPONEN_OBE.reduce((s, k) => s + (Number(b[k]) || 0), 0));

/** Nilai akhir = Σ komponen × bobot%. */
const hitungNilaiObe = (komponen, bobot) =>
  round2(KOMPONEN_OBE.reduce((s, k) => s + (Number(komponen[k]) || 0) * ((Number(bobot[k]) || 0) / 100), 0));

/** Bobot lama (sebelum ada rincian) ditampilkan sebagai satu baris per jenis berbobot > 0. */
const METODE_DEFAULT = { partisipatif: 'Aktivitas Partisipatif', tugas: 'Tugas Individu', quiz: 'Quiz', proyek: 'Proyek', uts: 'UTS', uas: 'UAS' };
const komponenEvaluasiOf = (b) =>
  Array.isArray(b.komponenEvaluasi) && b.komponenEvaluasi.length
    ? b.komponenEvaluasi
    : KOMPONEN_OBE.filter((k) => Number(b[k]) > 0).map((k) => ({
        metode: METODE_DEFAULT[k],
        jenis: k,
        bobot: Number(b[k]),
        syaratLulus: k === 'uts' || k === 'uas',
      }));

const toJson = (b) =>
  b
    ? {
        id: b.id,
        jadwalKuliahId: b.jadwalKuliahId,
        ...Object.fromEntries(KOMPONEN_OBE.map((k) => [k, Number(b[k]) || 0])),
        total: totalBobot(b),
        komponenEvaluasi: komponenEvaluasiOf(b),
        keterangan: b.keterangan,
        updatedAt: b.updatedAt,
        diubahOleh: b.updater?.name ?? (b.dosen ? [b.dosen.namaLengkap, b.dosen.gelar].filter(Boolean).join(', ') : null),
      }
    : null;

const getBobot = async (jadwalKuliahId) =>
  toJson(
    await BobotObe.findOne({
      where: { jadwalKuliahId },
      include: [
        { model: Dosen.unscoped(), as: 'dosen', attributes: ['namaLengkap', 'gelar'], required: false },
        { model: User, as: 'updater', attributes: ['name'], required: false },
      ],
    })
  );

/** Hitung ulang nilai akhir & huruf peserta kelas (KRS disetujui) yang sudah punya nilai. */
const hitungUlangNilaiKelas = async (jadwal, bobot, transaction) => {
  const roster = await KrsDetail.findAll({
    where: { jadwalKuliahId: jadwal.id },
    include: [{ model: Krs, as: 'krs', required: true, attributes: ['mahasiswaId', 'semester'], where: { status: 'DISETUJUI' } }],
    transaction,
  });
  let diubah = 0;
  for (const r of roster) {
    const nilai = await NilaiMahasiswa.findOne({
      where: { mahasiswaId: r.krs.mahasiswaId, kodeMataKuliah: jadwal.kodeMataKuliah, semester: r.krs.semester },
      transaction,
    });
    if (!nilai) continue;
    const akhir = hitungNilaiObe(nilai, bobot);
    await nilai.update({ nilai: akhir, grade: gradeFor(akhir) }, { transaction });
    diubah += 1;
  }
  return diubah;
};

/** { cpmkId: nilai } → hanya nilai > 0, dibulatkan; kosong → tidak disimpan. */
const petaCpmk = (obj) => {
  const hasil = Object.fromEntries(
    Object.entries(obj || {})
      .filter(([, v]) => Number(v) > 0)
      .map(([k, v]) => [k, round2(Number(v))])
  );
  return Object.keys(hasil).length ? hasil : null;
};
const sumCpmk = (obj) => round2(Object.values(obj || {}).reduce((s, v) => s + Number(v), 0));

/**
 * Rincian opsional satu metode (Komposisi Nilai Kelas, relasi CPMK RPS): `sub` = sub metode (bobot % dari
 * metode induk), `cpmk` = nilai per CPMK (% nilai akhir) pada metode tanpa sub / pada tiap sub.
 */
const rincianOpsional = (r) => {
  const out = {};
  const sub = (r.sub || []).map((s) => ({ nama: String(s.nama).trim(), bobot: round2(Number(s.bobot) || 0), cpmk: petaCpmk(s.cpmk) }));
  if (sub.length) out.sub = sub;
  const cpmk = sub.length ? null : petaCpmk(r.cpmk);
  if (cpmk) out.cpmk = cpmk;
  return out;
};

/** Sub metode: total bobot = 100%. Nilai CPMK (bila diisi): Σ nilai CPMK metode = bobot metode tsb. */
const cekRincian = (komponen) => {
  for (const r of komponen) {
    if (r.sub?.length) {
      const total = round2(r.sub.reduce((s, x) => s + x.bobot, 0));
      if (Math.abs(total - 100) > 0.01) throw new ApiError(400, `Total sub metode ${r.metode} harus 100% (sekarang ${total}%)`);
    }
    const nilaiCpmk = r.sub?.length ? round2(r.sub.reduce((s, x) => s + sumCpmk(x.cpmk), 0)) : sumCpmk(r.cpmk);
    if (nilaiCpmk > 0 && Math.abs(nilaiCpmk - r.bobot) > 0.01) {
      throw new ApiError(400, `Nilai CPMK ${r.metode} (${nilaiCpmk}%) harus sama dengan bobot evaluasinya (${r.bobot}%)`);
    }
  }
};

/**
 * Simpan bobot satu jadwal (buat/ubah). `aktor` = { dosenId } dari portal dosen atau
 * { userId } dari modul prodi. Mengembalikan bobot & jumlah nilai yang dihitung ulang.
 */
const simpanBobot = async (jadwalKuliahId, payload, aktor = {}) => {
  const jadwal = await JadwalKuliah.findByPk(jadwalKuliahId, { attributes: ['id', 'kodeMataKuliah'] });
  if (!jadwal) throw new ApiError(404, 'Jadwal kuliah tidak ditemukan');
  // Bobot per jenis = jumlah bobot baris Komponen Evaluasi berjenis sama (mis. Tugas Individu + Tugas Kelompok).
  // Rincian opsional dari Komposisi Nilai Kelas: nilai per CPMK & sub metode (lihat rincianOpsional).
  const komponenEvaluasi = (payload.komponenEvaluasi || []).map((r) => ({
    metode: String(r.metode).trim(),
    jenis: r.jenis,
    bobot: round2(Number(r.bobot) || 0),
    syaratLulus: !!r.syaratLulus,
    ...rincianOpsional(r),
  }));
  if (!komponenEvaluasi.length) throw new ApiError(400, 'Komponen Evaluasi wajib diisi');
  // Form yang tidak mengirim rincian (mis. portal dosen) tidak menghapus rincian lama baris yang sama.
  const lama = (await BobotObe.findOne({ where: { jadwalKuliahId }, attributes: ['komponenEvaluasi'] }))?.komponenEvaluasi ?? [];
  (payload.komponenEvaluasi || []).forEach((r, i) => {
    if ('sub' in r || 'cpmk' in r) return;
    const sama = lama.find((x) => x.metode === komponenEvaluasi[i].metode && x.jenis === komponenEvaluasi[i].jenis && round2(x.bobot) === komponenEvaluasi[i].bobot);
    if (sama?.sub) komponenEvaluasi[i].sub = sama.sub;
    if (sama?.cpmk) komponenEvaluasi[i].cpmk = sama.cpmk;
  });
  cekRincian(komponenEvaluasi);
  const data = Object.fromEntries(
    KOMPONEN_OBE.map((k) => [k, round2(komponenEvaluasi.filter((r) => r.jenis === k).reduce((s, r) => s + r.bobot, 0))])
  );
  const total = totalBobot(data);
  if (total !== 100) throw new ApiError(400, `Total persentase Komponen Evaluasi harus 100% (sekarang ${total}%)`);
  let diubah = 0;
  await sequelize.transaction(async (transaction) => {
    const ada = await BobotObe.findOne({ where: { jadwalKuliahId }, transaction });
    const values = {
      ...data,
      komponenEvaluasi,
      keterangan: payload.keterangan || null,
      dosenId: aktor.dosenId ?? null,
      updatedBy: aktor.userId ?? null,
    };
    if (ada) await ada.update(values, { transaction });
    else await BobotObe.create({ ...values, jadwalKuliahId }, { transaction });
    diubah = await hitungUlangNilaiKelas(jadwal, data, transaction);
  });
  return { bobot: await getBobot(jadwalKuliahId), nilaiDihitungUlang: diubah };
};

const hapusBobot = async (jadwalKuliahId) => {
  const jumlah = await BobotObe.destroy({ where: { jadwalKuliahId } });
  if (!jumlah) throw new ApiError(404, 'Bobot OBE kelas ini belum diisi');
};

// ---------- Modul prodi ----------

/** Daftar jadwal kuliah beserta bobot OBE-nya (filter tahun akademik, prodi, status isi, pencarian). */
const listBobotProdi = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const where = {};
  if (query.tahunAjaranId) where.tahunAjaranId = Number(query.tahunAjaranId);
  if (query.search) {
    const like = { [Op.like]: `%${query.search}%` };
    where[Op.or] = [{ kelas: like }, { kodeMataKuliah: like }, { namaMataKuliah: like }];
  }
  const jadwalList = await JadwalKuliah.findAll({
    where,
    attributes: ['id', 'kelas', 'kodeMataKuliah', 'namaMataKuliah', 'sks', 'semester', 'tahunAjaranId'],
    include: [
      { model: Dosen.unscoped(), as: 'dosenKordinator', attributes: ['namaLengkap', 'gelar'], required: false },
      { model: TahunAjaran, as: 'tahunAjaran', attributes: ['id', 'nama', 'jenisSemester'], required: false },
    ],
    order: [['kelas', 'ASC'], ['kodeMataKuliah', 'ASC']],
  });
  let rows = jadwalList;
  if (query.kodeProdi) rows = rows.filter((j) => kodeProdiJadwal(j) === String(query.kodeProdi));
  const bobotList = rows.length
    ? await BobotObe.findAll({
        where: { jadwalKuliahId: rows.map((j) => j.id) },
        include: [
          { model: Dosen.unscoped(), as: 'dosen', attributes: ['namaLengkap', 'gelar'], required: false },
          { model: User, as: 'updater', attributes: ['name'], required: false },
        ],
      })
    : [];
  const bobotBy = new Map(bobotList.map((b) => [b.jadwalKuliahId, toJson(b)]));
  let data = rows.map((j) => ({
    id: j.id,
    kelas: j.kelas,
    kodeMataKuliah: j.kodeMataKuliah,
    namaMataKuliah: j.namaMataKuliah,
    sks: j.sks,
    semester: j.semester,
    tahunAjaran: formatTahunAjaran(j.tahunAjaran),
    dosen: j.dosenKordinator ? [j.dosenKordinator.namaLengkap, j.dosenKordinator.gelar].filter(Boolean).join(', ') : null,
    bobot: bobotBy.get(j.id) ?? null,
  }));
  if (query.status === 'TERISI') data = data.filter((d) => d.bobot);
  if (query.status === 'BELUM') data = data.filter((d) => !d.bobot);
  return { data: data.slice(offset, offset + limit), meta: getPagingMeta(data.length, page, limit) };
};

module.exports = { KOMPONEN_OBE, hitungNilaiObe, getBobot, simpanBobot, hapusBobot, listBobotProdi };
