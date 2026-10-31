const { Op } = require('sequelize');
const { sequelize, Kurikulum, Jurusan, Mahasiswa, MataKuliah, Cpl, CplMataKuliah, Cpmk, CpmkCpl, NilaiKomponenObe, JadwalKuliah, Krs } = require('../models');
const ApiError = require('../utils/ApiError');
const bobotObeService = require('./bobotObe.service');
const { kolomDari, cpmkMataKuliah } = require('./nilaiObe.service');

/**
 * Laporan Capaian OBE (Prodi → Kurikulum → Laporan Capaian OBE).
 *
 * CPL per Mata Kuliah — nilai CPL tiap mata kuliah OBE kurikulum:
 * 1. Nilai mahasiswa per sel metode × CPMK (input nilai OBE dosen, nilai_komponen_obe) → capaian CPMK di
 *    kelas tsb = rata-rata berbobot sel CPMK itu (bobot sel dari komposisi nilai kelas).
 * 2. Pemetaan CPMK → CPL (cpmk_cpl, berbobot) → nilai CPL di mata kuliah = rata-rata berbobot capaian CPMK
 *    yang memetakan CPL tsb. IK digabung ke CPL induknya; Sub-CPMK ↔ CPMK induk saling melengkapi.
 * 3. Satu mahasiswa → nilai mahasiswa tsb; semua mahasiswa → rata-rata mahasiswa (angkatan terpilih) yang
 *    sudah punya nilai.
 * Sel "-" = mata kuliah tidak dibebankan CPL tsb; null = belum ada nilai.
 */
const round2 = (v) => Math.round(Number(v) * 100) / 100;
const rata = (list) => (list.length ? round2(list.reduce((s, v) => s + v, 0) / list.length) : null);
const JENJANG = { 1: 'Satu', 2: 'Dua', 3: 'Tiga', 4: 'Empat', 5: 'Lima', 6: 'Enam', 7: 'Tujuh', 8: 'Delapan', 9: 'Sembilan', 10: 'Sepuluh', 11: 'Sebelas', 12: 'Dua Belas', 13: 'Tiga Belas', 14: 'Empat Belas' };

const lingkup = (jurusanId) => (jurusanId ? [].concat(jurusanId).map(Number) : null);

/** Kurikulum dalam scope prodi sesi + id semua jurusan sekode prodi (varian Reguler/Karyawan/Malam). */
const findKurikulum = async (kurikulumId, jurusanId) => {
  const k = await Kurikulum.findByPk(kurikulumId, { include: [{ model: Jurusan, as: 'jurusan', required: false }] });
  if (!k) throw new ApiError(404, 'Kurikulum tidak ditemukan');
  const scope = lingkup(jurusanId);
  if (scope && !scope.includes(k.jurusanId)) throw new ApiError(403, 'Kurikulum ini bukan milik prodi Anda');
  const sekode = k.jurusan?.kodeProdi
    ? (await Jurusan.findAll({ where: { kodeProdi: k.jurusan.kodeProdi }, attributes: ['id'], raw: true })).map((j) => j.id)
    : [k.jurusanId];
  return { kurikulum: k, jurusanIds: sekode };
};

/** Pilihan form: kurikulum (scope prodi) beserta angkatan mahasiswa prodinya. */
const opsi = async (query = {}) => {
  const scope = lingkup(query.jurusanId);
  const list = await Kurikulum.findAll({
    where: scope ? { jurusanId: scope } : {},
    include: [{ model: Jurusan, as: 'jurusan', attributes: ['id', 'namaJurusan', 'kodeProdi', 'jenjangPendidikan'], required: false }],
    order: [['tahunKurikulum', 'DESC'], ['nama', 'ASC']],
  });
  const kodeList = [...new Set(list.map((k) => k.jurusan?.kodeProdi).filter(Boolean))];
  const angkatan = kodeList.length
    ? await sequelize.query(
        `SELECT DISTINCT j.kode_prodi AS kodeProdi, m.tahun_masuk AS tahun FROM mahasiswa m JOIN jurusan j ON j.id = m.jurusan_id
          WHERE j.kode_prodi IN (:kode) ORDER BY m.tahun_masuk DESC`,
        { replacements: { kode: kodeList }, type: sequelize.QueryTypes.SELECT }
      )
    : [];
  return list.map((k) => ({
    id: k.id,
    nama: k.nama,
    tahunKurikulum: k.tahunKurikulum,
    prodi: k.jurusan ? [k.jurusan.jenjangPendidikan, k.jurusan.namaJurusan].filter(Boolean).join(' - ') : null,
    angkatan: angkatan.filter((a) => a.kodeProdi === k.jurusan?.kodeProdi).map((a) => Number(a.tahun)),
  }));
};

/** Pencarian mahasiswa prodi kurikulum tsb (opsional angkatan) untuk pilihan "Salah Satu Mahasiswa". */
const cariMahasiswa = async (query = {}) => {
  const { jurusanIds } = await findKurikulum(Number(query.kurikulumId), query.jurusanId);
  const where = { jurusanId: jurusanIds };
  if (query.angkatan) where.tahunMasuk = Number(query.angkatan);
  if (query.search) where[Op.or] = [{ nim: { [Op.like]: `%${query.search}%` } }, { namaLengkap: { [Op.like]: `%${query.search}%` } }];
  const rows = await Mahasiswa.findAll({ where, attributes: ['id', 'nim', 'namaLengkap', 'tahunMasuk'], order: [['nim', 'ASC']], limit: query.search ? 50 : 1000 });
  return rows.map((m) => ({ id: m.id, nim: m.nim, nama: m.namaLengkap, angkatan: m.tahunMasuk }));
};

/** Laporan CPL per Mata Kuliah. */
const cplPerMataKuliah = async (query = {}) => {
  const { kurikulum, jurusanIds } = await findKurikulum(Number(query.kurikulumId), query.jurusanId);

  // CPL induk kurikulum (kolom) + peta IK → induk.
  const semuaCpl = await Cpl.findAll({ where: { kurikulumId: kurikulum.id }, order: [['kode', 'ASC'], ['id', 'ASC']] });
  const cpl = semuaCpl.filter((c) => !c.parentId);
  const indukCpl = (id) => {
    const c = semuaCpl.find((x) => x.id === id);
    return c ? (c.parentId ?? c.id) : null;
  };

  // Mata kuliah OBE kurikulum yang dibebankan CPL (baris).
  const mkList = await MataKuliah.findAll({ where: { kurikulumId: kurikulum.id, isObe: true }, order: [['semester', 'ASC'], ['kode', 'ASC']] });
  const cplMk = mkList.length ? await CplMataKuliah.findAll({ where: { mataKuliahId: mkList.map((m) => m.id) }, raw: true }) : [];
  const cplDibebankan = new Map(mkList.map((m) => [m.id, new Set(cplMk.filter((x) => x.mataKuliahId === m.id).map((x) => indukCpl(x.cplId)))]));
  const barisMk = mkList.filter((m) => cplDibebankan.get(m.id).size);

  // CPMK & pemetaan CPMK → CPL.
  const cpmk = barisMk.length ? await Cpmk.findAll({ where: { mataKuliahId: barisMk.map((m) => m.id) }, attributes: ['id', 'parentId', 'mataKuliahId'], raw: true }) : [];
  const peta = cpmk.length ? await CpmkCpl.findAll({ where: { cpmkId: cpmk.map((c) => c.id) } }) : [];

  // Mahasiswa.
  let mahasiswa;
  if (query.mahasiswaId) {
    const m = await Mahasiswa.findByPk(Number(query.mahasiswaId), { attributes: ['id', 'nim', 'namaLengkap', 'jurusanId', 'tahunMasuk'] });
    if (!m || !jurusanIds.includes(m.jurusanId)) throw new ApiError(400, 'Mahasiswa bukan dari program studi kurikulum ini');
    mahasiswa = [m];
  } else {
    const where = { jurusanId: jurusanIds };
    if (query.angkatan) where.tahunMasuk = Number(query.angkatan);
    mahasiswa = await Mahasiswa.findAll({ where, attributes: ['id', 'nim', 'namaLengkap', 'tahunMasuk'] });
  }
  const mhsIds = mahasiswa.map((m) => m.id);

  // Kelas mata kuliah tsb & nilai sel OBE mahasiswa.
  const jadwal = barisMk.length ? await JadwalKuliah.findAll({ where: { mataKuliahId: barisMk.map((m) => m.id) }, attributes: ['id', 'mataKuliahId'], raw: true }) : [];
  const sel =
    jadwal.length && mhsIds.length
      ? await NilaiKomponenObe.findAll({ where: { jadwalKuliahId: jadwal.map((j) => j.id), mahasiswaId: mhsIds } })
      : [];
  // Bobot sel dari komposisi nilai kelas (fallback bobot sama).
  const kolomJadwal = new Map();
  for (const jid of [...new Set(sel.map((s) => s.jadwalKuliahId))]) {
    const j = jadwal.find((x) => x.id === jid);
    const komposisi = await bobotObeService.getBobot(jid);
    const { kolom } = kolomDari(komposisi?.komponenEvaluasi ?? [], await cpmkMataKuliah(j.mataKuliahId));
    kolomJadwal.set(jid, new Map(kolom.map((k) => [k.kunci, k.bobot])));
  }

  /** Capaian CPMK per (mahasiswa, MK): { cpmkId: nilai } dari sel "komponen|cpmkId". */
  const capaianCpmk = new Map();
  const tampung = new Map();
  sel.forEach((s) => {
    const [, cpmkId] = String(s.kunci).split('|');
    if (!cpmkId) return;
    const mk = jadwal.find((j) => j.id === s.jadwalKuliahId)?.mataKuliahId;
    const bobot = kolomJadwal.get(s.jadwalKuliahId)?.get(s.kunci) ?? 1;
    const key = `${s.mahasiswaId}|${mk}|${cpmkId}`;
    const t = tampung.get(key) ?? { total: 0, bobot: 0 };
    t.total += s.nilai * bobot;
    t.bobot += bobot;
    tampung.set(key, t);
  });
  tampung.forEach((t, key) => {
    const [mhs, mk, cpmkId] = key.split('|');
    const k = `${mhs}|${mk}`;
    if (!capaianCpmk.has(k)) capaianCpmk.set(k, {});
    if (t.bobot) capaianCpmk.get(k)[cpmkId] = t.total / t.bobot;
  });
  /** Capaian satu CPMK: langsung, atau rata-rata Sub-CPMK-nya, atau CPMK induknya. */
  const nilaiCpmk = (cap, id) => {
    if (cap[id] !== undefined) return cap[id];
    const sub = cpmk.filter((c) => c.parentId === id).map((c) => cap[c.id]).filter((v) => v !== undefined);
    if (sub.length) return sub.reduce((s, v) => s + v, 0) / sub.length;
    const parent = cpmk.find((c) => c.id === id)?.parentId;
    return parent && cap[parent] !== undefined ? cap[parent] : undefined;
  };
  /** Nilai CPL induk `cplId` satu mahasiswa di satu MK (rata-rata berbobot capaian CPMK pemetanya). */
  const nilaiCpl = (mhsId, mkId, cplId) => {
    const cap = capaianCpmk.get(`${mhsId}|${mkId}`);
    if (!cap) return null;
    let total = 0;
    let bobot = 0;
    peta
      .filter((p) => indukCpl(p.cplId) === cplId && cpmk.find((c) => c.id === p.cpmkId)?.mataKuliahId === mkId)
      .forEach((p) => {
        const v = nilaiCpmk(cap, p.cpmkId);
        if (v === undefined) return;
        const w = p.bobot > 0 ? p.bobot : 1;
        total += v * w;
        bobot += w;
      });
    return bobot ? total / bobot : null;
  };

  const baris = barisMk.map((m) => ({
    mataKuliahId: m.id,
    semester: m.semester,
    kode: m.kode,
    mataKuliah: m.mataKuliah,
    sks: m.sksTotal,
    // Target capaian CPL MK OBE (Setting Kurikulum), null bila belum diatur.
    targetCpl: m.targetCpl,
    nilai: Object.fromEntries(
      cpl.map((c) => {
        if (!cplDibebankan.get(m.id).has(c.id)) return [c.id, '-'];
        const per = mhsIds.map((id) => nilaiCpl(id, m.id, c.id)).filter((v) => v !== null);
        return [c.id, rata(per)];
      })
    ),
  }));

  // Keterangan: rata-rata tiap CPL atas seluruh MK yang bernilai.
  const ringkasCpl = cpl
    .map((c) => ({ kode: c.kode, nilai: rata(baris.map((b) => b.nilai[c.id]).filter((v) => typeof v === 'number')) }))
    .filter((r) => r.nilai !== null);
  const urut = [...ringkasCpl].sort((a, b) => b.nilai - a.nilai);

  // Semester berjalan (satu mahasiswa) = semester KRS terakhir.
  let semester = null;
  if (query.mahasiswaId) {
    const krs = await Krs.max('semester', { where: { mahasiswaId: Number(query.mahasiswaId) } });
    semester = Number.isFinite(krs) ? krs : null;
  }

  return {
    kurikulum: { id: kurikulum.id, nama: kurikulum.nama, tahunKurikulum: kurikulum.tahunKurikulum },
    prodi: kurikulum.jurusan ? [kurikulum.jurusan.jenjangPendidikan, kurikulum.jurusan.namaJurusan].filter(Boolean).join(' - ') : null,
    namaProdi: kurikulum.jurusan?.namaJurusan ?? null,
    mahasiswa: query.mahasiswaId ? { id: mahasiswa[0].id, nim: mahasiswa[0].nim, nama: mahasiswa[0].namaLengkap } : null,
    jumlahMahasiswa: mahasiswa.length,
    jumlahMahasiswaBernilai: new Set(sel.map((s) => s.mahasiswaId)).size,
    angkatan: query.angkatan ? Number(query.angkatan) : null,
    semester,
    semesterTerbilang: semester ? JENJANG[semester] ?? null : null,
    cpl: cpl.map((c) => ({ id: c.id, kode: c.kode, deskripsi: c.deskripsi })),
    baris,
    ringkasan: {
      tertinggi: urut[0] ?? null,
      terendah: urut[urut.length - 1] ?? null,
      rataRata: rata(ringkasCpl.map((r) => r.nilai)),
      perCpl: ringkasCpl,
    },
  };
};

/** Target CPL bila tidak satu pun MK pembebannya punya target (Setting Kurikulum). */
const TARGET_DEFAULT = 60;

/**
 * Transkrip OBE (per mahasiswa, atau rata-rata angkatan bila tanpa mahasiswaId) — diturunkan dari laporan
 * CPL per Mata Kuliah: per CPL rerata nilai atas MK yang sudah bernilai, target = rata-rata target CPL MK yang
 * dibebankan CPL tsb (default 60), status Sudah/Belum Memenuhi/Belum Dinilai, progres = MK bernilai / MK
 * pembeban. Ditambah penanda tangan (Ketua Program Studi).
 */
const transkripObe = async (query = {}) => {
  const dasar = await cplPerMataKuliah(query);
  const k = await Kurikulum.findByPk(dasar.kurikulum.id, { include: [{ model: Jurusan, as: 'jurusan', attributes: ['kodeProdi'], required: false }] });
  const { loadPenandatanganProdi } = require('../utils/kaprodi');
  const ttd = await loadPenandatanganProdi(k?.jurusan?.kodeProdi);
  const cpl = dasar.cpl.map((c) => {
    const pembeban = dasar.baris.filter((b) => b.nilai[c.id] !== '-');
    const bernilai = pembeban.map((b) => b.nilai[c.id]).filter((v) => typeof v === 'number');
    const target = rata(pembeban.map((b) => b.targetCpl).filter((t) => t !== null && t !== undefined).map(Number));
    const rerata = rata(bernilai);
    const tgt = target ?? TARGET_DEFAULT;
    return {
      id: c.id,
      kode: c.kode,
      deskripsi: c.deskripsi,
      target: tgt,
      targetDefault: target === null,
      rerata,
      status: rerata === null ? 'BELUM_DINILAI' : rerata >= tgt ? 'MEMENUHI' : 'BELUM_MEMENUHI',
      dinilai: bernilai.length,
      jumlahMk: pembeban.length,
    };
  });
  return { ...dasar, cplTranskrip: cpl, targetDefault: TARGET_DEFAULT, penandatangan: ttd };
};

module.exports = { opsi, cariMahasiswa, cplPerMataKuliah, transkripObe };
