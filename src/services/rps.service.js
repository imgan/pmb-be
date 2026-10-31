const { Op } = require('sequelize');
const {
  sequelize,
  MataKuliah,
  Kurikulum,
  Jurusan,
  TahunAjaran,
  Cpl,
  CplMataKuliah,
  Cpmk,
  CpmkCpl,
  Rps,
  RpsPertemuan,
  RpsEvaluasi,
  RpsEvaluasiCpmk,
} = require('../models');
const ApiError = require('../utils/ApiError');
const { buildWorkbook, parseWorkbookFromBase64 } = require('../utils/excel');

/**
 * RPS per mata kuliah (Prodi → Kurikulum → Matakuliah Aktif → RPS): Data Mata Kuliah, Pemetaan CPL
 * (cpl_mata_kuliah untuk MK ini, level CPL/IK mengikuti kurikulum), Pemetaan CPMK (CPMK/Sub-CPMK + CPMK → CPL),
 * Detail RPS, Rencana Pembelajaran (per sesi) & Rencana Evaluasi. Detail RPS, rencana pembelajaran & evaluasi
 * disimpan per periode (tahun ajaran "berlaku sejak"). Data dibatasi prodi sesi lewat `jurusanId` (prodiScope).
 */

const JENIS_PERTEMUAN = ['KULIAH', 'PRAKTIKUM', 'UTS', 'UAS', 'LAINNYA'];
const METODE_EVALUASI = ['TUGAS_INDIVIDU', 'TUGAS_KELOMPOK', 'KUIS', 'UTS', 'UAS', 'PRAKTIKUM', 'PROYEK', 'PRESENTASI', 'PARTISIPASI', 'LAINNYA'];
const JENIS_PERTEMUAN_LABEL = { KULIAH: 'Kuliah', PRAKTIKUM: 'Praktikum', UTS: 'UTS', UAS: 'UAS', LAINNYA: 'Lainnya' };

const bulat2 = (n) => Math.round(Number(n) * 100) / 100;
const teks = (v) => (v === null || v === undefined || String(v).trim() === '' ? null : String(v).trim());

/** Mata kuliah dalam scope prodi sesi (jurusanId dari prodiScope), beserta kurikulum & prodinya. */
const findMataKuliah = async (mataKuliahId, jurusanId) => {
  const mk = await MataKuliah.findByPk(mataKuliahId, {
    include: [
      {
        model: Kurikulum,
        as: 'kurikulum',
        required: false,
        include: [{ model: Jurusan, as: 'jurusan', attributes: ['id', 'namaJurusan', 'kodeProdi', 'jenjangPendidikan'], required: false }],
      },
    ],
  });
  if (!mk) throw new ApiError(404, 'Mata kuliah tidak ditemukan');
  const scope = jurusanId ? [].concat(jurusanId).map(Number) : null;
  if (scope && !scope.includes(mk.kurikulum?.jurusanId)) throw new ApiError(403, 'Mata kuliah ini bukan milik prodi Anda');
  return mk;
};

const findTahunAjaran = async (tahunAjaranId) => {
  const ta = await TahunAjaran.findByPk(tahunAjaranId);
  if (!ta) throw new ApiError(400, 'Periode akademik tidak ditemukan');
  return ta;
};

/** Pilihan "Cari Mata Kuliah": semua MK kurikulum dalam scope prodi. */
const listMataKuliah = async (query = {}) => {
  const whereKurikulum = query.jurusanId ? { jurusanId: [].concat(query.jurusanId).map(Number) } : undefined;
  const rows = await MataKuliah.findAll({
    attributes: ['id', 'kode', 'mataKuliah', 'semester'],
    include: [{ model: Kurikulum, as: 'kurikulum', attributes: ['id', 'tahunKurikulum', 'nama'], where: whereKurikulum, required: !!whereKurikulum }],
    order: [['kode', 'ASC']],
  });
  return rows.map((m) => ({ id: m.id, kode: m.kode, mataKuliah: m.mataKuliah, semester: m.semester, tahunKurikulum: m.kurikulum?.tahunKurikulum ?? null }));
};

/** CPL/IK yang boleh dipetakan ke MK sesuai level kurikulum (CPL: induk; IK: IK atau CPL tanpa IK). */
const cplBoleh = (semuaCpl, level) => {
  const punyaIk = new Set(semuaCpl.filter((c) => c.parentId).map((c) => c.parentId));
  return new Set(semuaCpl.filter((c) => (level === 'IK' ? c.parentId || !punyaIk.has(c.id) : !c.parentId)).map((c) => c.id));
};

/** Detail RPS mata kuliah: info MK, CPL kurikulum + yang dipetakan, CPMK + pemetaannya, periode yang sudah berisi data. */
const getDetail = async (mataKuliahId, jurusanId) => {
  const mk = await findMataKuliah(mataKuliahId, jurusanId);
  const [cpl, cplMk, cpmk, periodeRows] = await Promise.all([
    mk.kurikulumId ? Cpl.findAll({ where: { kurikulumId: mk.kurikulumId }, order: [['kode', 'ASC'], ['id', 'ASC']] }) : [],
    CplMataKuliah.findAll({ where: { mataKuliahId: mk.id }, attributes: ['cplId'], raw: true }),
    Cpmk.findAll({ where: { mataKuliahId: mk.id }, order: [['kode', 'ASC'], ['id', 'ASC']] }),
    sequelize.query(
      `SELECT tahun_ajaran_id AS id FROM rps WHERE mata_kuliah_id = :mk
       UNION SELECT tahun_ajaran_id FROM rps_pertemuan WHERE mata_kuliah_id = :mk
       UNION SELECT tahun_ajaran_id FROM rps_evaluasi WHERE mata_kuliah_id = :mk`,
      { replacements: { mk: mk.id }, type: sequelize.QueryTypes.SELECT }
    ),
  ]);
  const cpmkCpl = cpmk.length ? await CpmkCpl.findAll({ where: { cpmkId: cpmk.map((c) => c.id) }, attributes: ['cpmkId', 'cplId', 'bobot'] }) : [];
  const k = mk.kurikulum;
  return {
    mataKuliah: {
      id: mk.id,
      kode: mk.kode,
      mataKuliah: mk.mataKuliah,
      mataKuliahEn: mk.mataKuliahEn,
      semester: mk.semester,
      sksTeori: mk.sksTeori,
      sksPraktek: mk.sksPraktek,
      sksLab: mk.sksLab,
      sksSimulasi: mk.sksSimulasi,
      sksTotal: mk.sksTotal,
      jenisMataKuliah: mk.jenisMataKuliah,
      kelompokMataKuliah: mk.kelompokMataKuliah,
      kelompokKurikulum: mk.kelompokKurikulum,
      metodePembelajaran: mk.metodePembelajaran,
      isObe: mk.isObe,
      targetCpl: mk.targetCpl,
      targetCpmk: mk.targetCpmk,
      levelPemetaanCpmk: mk.levelPemetaanCpmk,
      metodeBobotCpmk: mk.metodeBobotCpmk,
      silabus: mk.silabus,
      kurikulumId: mk.kurikulumId,
      kurikulum: k?.nama ?? null,
      tahunKurikulum: k?.tahunKurikulum ?? null,
      levelPemetaanCplMk: k?.levelPemetaanCplMk ?? 'CPL',
      kodeProdi: k?.jurusan?.kodeProdi ?? null,
      prodi: k?.jurusan?.namaJurusan ?? null,
      jenjang: k?.jurusan?.jenjangPendidikan ?? null,
    },
    cpl: cpl.map((c) => ({ id: c.id, parentId: c.parentId, kode: c.kode, aspek: c.aspek, deskripsi: c.deskripsi })),
    cplIds: cplMk.map((r) => r.cplId),
    cpmk,
    cpmkCpl: cpmkCpl.map((r) => ({ cpmkId: r.cpmkId, cplId: r.cplId, bobot: r.bobot })),
    periodeIds: periodeRows.map((r) => Number(r.id)),
  };
};

/** Data satu periode: detail RPS, rencana pembelajaran (urut sesi) & rencana evaluasi. */
const getPeriode = async (mataKuliahId, tahunAjaranId, jurusanId) => {
  const mk = await findMataKuliah(mataKuliahId, jurusanId);
  const where = { mataKuliahId: mk.id, tahunAjaranId: Number(tahunAjaranId) };
  const [rps, pertemuan, evaluasi] = await Promise.all([
    Rps.findOne({ where }),
    RpsPertemuan.findAll({ where, order: [['sesi', 'ASC']] }),
    RpsEvaluasi.findAll({ where, order: [['urutan', 'ASC'], ['id', 'ASC']] }),
  ]);
  const evaluasiCpmk = evaluasi.length
    ? await RpsEvaluasiCpmk.findAll({ where: { rpsEvaluasiId: evaluasi.map((e) => e.id) }, attributes: ['rpsEvaluasiId', 'cpmkId', 'bobot'] })
    : [];
  return {
    rps,
    pertemuan,
    evaluasi,
    evaluasiCpmk: evaluasiCpmk.map((r) => ({ rpsEvaluasiId: r.rpsEvaluasiId, cpmkId: r.cpmkId, bobot: r.bobot })),
  };
};

// ---------- Pemetaan CPL (cpl_mata_kuliah untuk MK ini) ----------
const saveCpl = async (mataKuliahId, cplIds, jurusanId) => {
  const mk = await findMataKuliah(mataKuliahId, jurusanId);
  const level = mk.kurikulum?.levelPemetaanCplMk ?? 'CPL';
  const semuaCpl = await Cpl.findAll({ where: { kurikulumId: mk.kurikulumId }, attributes: ['id', 'parentId'], raw: true });
  const boleh = cplBoleh(semuaCpl, level);
  const ids = [...new Set(cplIds.map(Number))];
  if (ids.some((id) => !boleh.has(id))) throw new ApiError(400, `Pemetaan level ${level} hanya boleh berisi ${level === 'IK' ? 'IK / CPL tanpa IK' : 'CPL induk'} kurikulum ini`);
  const cpmkIds = (await Cpmk.findAll({ where: { mataKuliahId: mk.id }, attributes: ['id'], raw: true })).map((c) => c.id);
  await sequelize.transaction(async (transaction) => {
    await CplMataKuliah.destroy({ where: { mataKuliahId: mk.id }, transaction });
    if (ids.length) await CplMataKuliah.bulkCreate(ids.map((cplId) => ({ cplId, mataKuliahId: mk.id })), { transaction });
    // Pemetaan CPMK ke CPL yang tidak lagi dibebankan ke MK ini ikut dilepas.
    if (cpmkIds.length) await CpmkCpl.destroy({ where: { cpmkId: cpmkIds, ...(ids.length ? { cplId: { [Op.notIn]: ids } } : {}) }, transaction });
  });
  return { jumlah: ids.length };
};

// ---------- CPMK / Sub-CPMK ----------
const saveCpmk = async (mataKuliahId, payload, jurusanId, id = null) => {
  const mk = await findMataKuliah(mataKuliahId, jurusanId);
  const kode = String(payload.kode).trim();
  const dobel = await Cpmk.findOne({ where: { mataKuliahId: mk.id, kode, ...(id ? { id: { [Op.ne]: id } } : {}) } });
  if (dobel) throw new ApiError(400, `Kode ${kode} sudah dipakai di mata kuliah ini`);
  const item = id ? await Cpmk.findOne({ where: { id, mataKuliahId: mk.id } }) : null;
  if (id && !item) throw new ApiError(404, 'CPMK tidak ditemukan');
  // Sub-CPMK: induk harus CPMK (bukan Sub-CPMK) di MK yang sama. Induk tidak bisa diganti saat ubah.
  const parentId = item ? item.parentId : payload.parentId || null;
  if (parentId) {
    const induk = await Cpmk.findOne({ where: { id: parentId, mataKuliahId: mk.id } });
    if (!induk || induk.parentId) throw new ApiError(400, 'CPMK induk tidak valid');
  }
  const values = { mataKuliahId: mk.id, parentId, kode, deskripsi: String(payload.deskripsi).trim(), deskripsiEn: teks(payload.deskripsiEn) };
  return item ? item.update(values) : Cpmk.create(values);
};

const deleteCpmk = async (mataKuliahId, id, jurusanId) => {
  const mk = await findMataKuliah(mataKuliahId, jurusanId);
  const item = await Cpmk.findOne({ where: { id, mataKuliahId: mk.id } });
  if (!item) throw new ApiError(404, 'CPMK tidak ditemukan');
  await item.destroy(); // Sub-CPMK, pemetaan & nilai CPMK rencana evaluasi ikut terhapus (FK CASCADE)
};

/** Salin CPMK + Sub-CPMK dari mata kuliah lain (kode yang sudah ada dilewati; pemetaan CPL tidak ikut). */
const salinCpmk = async (mataKuliahId, dariMataKuliahId, jurusanId) => {
  if (Number(dariMataKuliahId) === Number(mataKuliahId)) throw new ApiError(400, 'Pilih mata kuliah sumber yang berbeda');
  const mk = await findMataKuliah(mataKuliahId, jurusanId);
  await findMataKuliah(dariMataKuliahId, null);
  const [sumber, ada] = await Promise.all([
    Cpmk.findAll({ where: { mataKuliahId: dariMataKuliahId }, order: [['kode', 'ASC']] }),
    Cpmk.findAll({ where: { mataKuliahId: mk.id }, attributes: ['id', 'kode'], raw: true }),
  ]);
  const idByKode = new Map(ada.map((r) => [r.kode, r.id]));
  const baru = sumber.filter((s) => !idByKode.has(s.kode));
  const kodeSumber = new Map(sumber.map((s) => [s.id, s.kode]));
  await sequelize.transaction(async (transaction) => {
    for (const s of baru.filter((x) => !x.parentId)) {
      const c = await Cpmk.create({ mataKuliahId: mk.id, parentId: null, kode: s.kode, deskripsi: s.deskripsi, deskripsiEn: s.deskripsiEn }, { transaction });
      idByKode.set(c.kode, c.id);
    }
    for (const s of baru.filter((x) => x.parentId)) {
      const parentId = idByKode.get(kodeSumber.get(s.parentId)) ?? null;
      await Cpmk.create({ mataKuliahId: mk.id, parentId, kode: s.kode, deskripsi: s.deskripsi, deskripsiEn: s.deskripsiEn }, { transaction });
    }
  });
  return { disalin: baru.length, dilewati: sumber.length - baru.length };
};

/** Bobot rata: 100 ÷ jumlah sel (2 desimal); sisa pembulatan masuk ke sel terakhir agar total 100. */
const bobotRata = (pairs) => {
  if (!pairs.length) return [];
  const rata = Math.floor(10000 / pairs.length) / 100;
  const sisa = bulat2(100 - rata * (pairs.length - 1));
  return pairs.map((p, i) => ({ ...p, bobot: i === pairs.length - 1 ? sisa : rata }));
};

/**
 * Simpan seluruh tabel Pemetaan CPMK sekaligus (tombol Simpan Data): level & metode pembobotan MK,
 * daftar CPMK / Sub-CPMK (tambah, ubah, hapus yang tidak dikirim) dan sel CPMK → CPL berbobot.
 * - cpmk[]: { key, id?, parentKey?, kode, deskripsi, deskripsiEn } — key = id lama atau kunci sementara baris baru.
 * - pairs[]: { cpmkKey, cplId, bobot } — baris sesuai level (CPMK: induk; SUB_CPMK: Sub-CPMK / CPMK tanpa Sub).
 * OTOMATIS: bobot dibagi rata ke semua sel. MANUAL: sel berbobot 0/kosong diabaikan; total harus 100%.
 */
const savePemetaanCpmk = async (mataKuliahId, { level = 'CPMK', metode = 'OTOMATIS', cpmk: daftar, pairs }, jurusanId) => {
  const mk = await findMataKuliah(mataKuliahId, jurusanId);
  const [lama, cplMk, semuaCpl] = await Promise.all([
    Cpmk.findAll({ where: { mataKuliahId: mk.id }, attributes: ['id', 'parentId'], raw: true }),
    CplMataKuliah.findAll({ where: { mataKuliahId: mk.id }, attributes: ['cplId'], raw: true }),
    Cpl.findAll({ where: { kurikulumId: mk.kurikulumId }, attributes: ['id', 'parentId'], raw: true }),
  ]);
  const idLama = new Set(lama.map((c) => c.id));

  // Validasi daftar CPMK.
  const byKey = new Map(daftar.map((c) => [String(c.key), c]));
  const kodeDipakai = new Map();
  for (const c of daftar) {
    const kode = String(c.kode ?? '').trim();
    if (!kode) throw new ApiError(400, 'Kode CPMK wajib diisi');
    if (!String(c.deskripsi ?? '').trim()) throw new ApiError(400, `Deskripsi ${kode} wajib diisi`);
    if (kodeDipakai.has(kode.toLowerCase())) throw new ApiError(400, `Kode ${kode} dipakai lebih dari sekali`);
    kodeDipakai.set(kode.toLowerCase(), true);
    if (c.id && !idLama.has(Number(c.id))) throw new ApiError(400, `CPMK ${kode} bukan milik mata kuliah ini`);
    if (c.parentKey) {
      const induk = byKey.get(String(c.parentKey));
      if (!induk || induk.parentKey) throw new ApiError(400, `CPMK induk untuk ${kode} tidak valid`);
    }
  }
  const punyaSub = new Set(daftar.filter((c) => c.parentKey).map((c) => String(c.parentKey)));
  const barisValid = (key) => {
    const c = byKey.get(String(key));
    if (!c) return false;
    return level === 'SUB_CPMK' ? !!c.parentKey || !punyaSub.has(String(c.key)) : !c.parentKey;
  };
  // Kolom = CPL/IK kurikulum sesuai level pemetaan CPL → MK.
  const cplIds = cplBoleh(semuaCpl, mk.kurikulum?.levelPemetaanCplMk ?? 'CPL');
  if (pairs.some((p) => !barisValid(p.cpmkKey) || !cplIds.has(p.cplId))) {
    throw new ApiError(400, `Pemetaan level ${level === 'SUB_CPMK' ? 'Sub-CPMK' : 'CPMK'} hanya boleh berisi baris sesuai level & CPL kurikulum mata kuliah ini`);
  }

  let rows;
  if (metode === 'MANUAL') {
    rows = pairs.filter((p) => Number(p.bobot) > 0).map((p) => ({ ...p, bobot: bulat2(p.bobot) }));
    const total = bulat2(rows.reduce((s, r) => s + r.bobot, 0));
    if (rows.length && Math.abs(total - 100) > 0.01) throw new ApiError(400, `Total bobot CPMK harus 100% (sekarang ${total}%)`);
  } else {
    rows = bobotRata(pairs);
  }

  await sequelize.transaction(async (transaction) => {
    await mk.update({ levelPemetaanCpmk: level, metodeBobotCpmk: metode }, { transaction });
    const dikirim = new Set(daftar.filter((c) => c.id).map((c) => Number(c.id)));
    const hapus = [...idLama].filter((id) => !dikirim.has(id));
    if (hapus.length) await Cpmk.destroy({ where: { id: hapus }, transaction });
    // Kode dikosongkan sementara agar tukar kode antar baris tidak bentrok dengan indeks unik.
    if (dikirim.size) await Cpmk.update({ kode: sequelize.fn('CONCAT', '~', sequelize.col('id')) }, { where: { id: [...dikirim] }, transaction });

    const idByKey = new Map();
    const simpan = async (c, parentId) => {
      const values = { mataKuliahId: mk.id, parentId, kode: String(c.kode).trim(), deskripsi: String(c.deskripsi).trim(), deskripsiEn: teks(c.deskripsiEn) };
      if (c.id) {
        await Cpmk.update(values, { where: { id: Number(c.id) }, transaction });
        idByKey.set(String(c.key), Number(c.id));
      } else {
        const baru = await Cpmk.create(values, { transaction });
        idByKey.set(String(c.key), baru.id);
      }
    };
    for (const c of daftar.filter((x) => !x.parentKey)) await simpan(c, null);
    for (const c of daftar.filter((x) => x.parentKey)) await simpan(c, idByKey.get(String(c.parentKey)));

    const semuaId = [...idByKey.values()];
    if (semuaId.length) await CpmkCpl.destroy({ where: { cpmkId: semuaId }, transaction });
    if (rows.length) {
      await CpmkCpl.bulkCreate(
        rows.map((p) => ({ cpmkId: idByKey.get(String(p.cpmkKey)), cplId: p.cplId, bobot: p.bobot })),
        { transaction }
      );
    }
    // CPL yang diberi bobot otomatis ikut dibebankan ke MK ini (menu Pemetaan CPL / CPL → MK).
    const sudah = new Set(cplMk.map((r) => r.cplId));
    const tambahCpl = [...new Set(rows.map((r) => r.cplId))].filter((id) => !sudah.has(id));
    if (tambahCpl.length) await CplMataKuliah.bulkCreate(tambahCpl.map((cplId) => ({ cplId, mataKuliahId: mk.id })), { transaction });
  });
  return { jumlahCpmk: daftar.length, jumlahPemetaan: rows.length };
};

// ---------- Detail RPS (per periode) ----------
const RPS_FIELDS = [
  'deskripsi',
  'bahanKajian',
  'pustakaUtama',
  'pustakaPendukung',
  'mediaSoftware',
  'mediaHardware',
  'mkPrasyarat',
  'dosenPengembang',
  'koordinatorRmk',
  'teamTeaching',
  'tanggalPenyusunan',
];
const saveRps = async (mataKuliahId, tahunAjaranId, payload, jurusanId) => {
  const mk = await findMataKuliah(mataKuliahId, jurusanId);
  await findTahunAjaran(tahunAjaranId);
  const values = Object.fromEntries(RPS_FIELDS.map((f) => [f, teks(payload[f])]));
  const where = { mataKuliahId: mk.id, tahunAjaranId: Number(tahunAjaranId) };
  const item = await Rps.findOne({ where });
  return item ? item.update(values) : Rps.create({ ...where, ...values });
};

// ---------- Rencana Pembelajaran ----------
/** Id CPMK/Sub-CPMK milik MK ini saja (yang lain dibuang). */
const saringCpmk = async (mataKuliahId, ids) => {
  if (!ids?.length) return [];
  const milik = new Set((await Cpmk.findAll({ where: { mataKuliahId }, attributes: ['id'], raw: true })).map((c) => c.id));
  return [...new Set(ids.map(Number))].filter((id) => milik.has(id));
};

const PERTEMUAN_FIELDS = ['materiEn', 'indikator', 'kriteriaPenilaian', 'bentukPembelajaran', 'metodePembelajaran', 'waktu', 'referensi'];
const BENTUK_PEMBELAJARAN = ['LURING', 'DARING', 'HYBRID'];
const savePertemuan = async (mataKuliahId, payload, jurusanId, id = null) => {
  const mk = await findMataKuliah(mataKuliahId, jurusanId);
  const item = id ? await RpsPertemuan.findOne({ where: { id, mataKuliahId: mk.id } }) : null;
  if (id && !item) throw new ApiError(404, 'Rencana pembelajaran tidak ditemukan');
  const tahunAjaranId = item ? item.tahunAjaranId : Number(payload.tahunAjaranId);
  if (!item) await findTahunAjaran(tahunAjaranId);
  const sesi = Number(payload.sesi);
  const dobel = await RpsPertemuan.findOne({ where: { mataKuliahId: mk.id, tahunAjaranId, sesi, ...(id ? { id: { [Op.ne]: id } } : {}) } });
  if (dobel) throw new ApiError(400, `Sesi ${sesi} sudah ada pada periode ini`);
  const values = {
    mataKuliahId: mk.id,
    tahunAjaranId,
    sesi,
    jenisPertemuan: payload.jenisPertemuan,
    cpmkIds: await saringCpmk(mk.id, payload.cpmkIds),
    materi: String(payload.materi).trim(),
    ...Object.fromEntries(PERTEMUAN_FIELDS.map((f) => [f, teks(payload[f])])),
    bobot: payload.bobot === null || payload.bobot === undefined || payload.bobot === '' ? null : bulat2(payload.bobot),
  };
  return item ? item.update(values) : RpsPertemuan.create(values);
};

const deletePertemuan = async (mataKuliahId, id, jurusanId) => {
  const mk = await findMataKuliah(mataKuliahId, jurusanId);
  const item = await RpsPertemuan.findOne({ where: { id, mataKuliahId: mk.id } });
  if (!item) throw new ApiError(404, 'Rencana pembelajaran tidak ditemukan');
  await item.destroy();
};

/** Peta id CPMK sumber → id CPMK MK tujuan (lewat kode) bila menyalin dari MK lain. */
const petaCpmk = async (dariMataKuliahId, keMataKuliahId) => {
  if (Number(dariMataKuliahId) === Number(keMataKuliahId)) return null; // MK sama: id tetap
  const [sumber, tujuan] = await Promise.all([
    Cpmk.findAll({ where: { mataKuliahId: dariMataKuliahId }, attributes: ['id', 'kode'], raw: true }),
    Cpmk.findAll({ where: { mataKuliahId: keMataKuliahId }, attributes: ['id', 'kode'], raw: true }),
  ]);
  const idByKode = new Map(tujuan.map((c) => [c.kode, c.id]));
  return new Map(sumber.map((c) => [c.id, idByKode.get(c.kode) ?? null]));
};

/**
 * Salin rencana pembelajaran / rencana evaluasi dari periode lain (MK yang sama atau MK lain) ke periode
 * tujuan. Pembelajaran: sesi yang sudah ada dilewati. Evaluasi: ditambahkan semua. CPMK dari MK lain
 * dicocokkan lewat kode.
 */
const salinPeriode = async (jenis, mataKuliahId, { dariMataKuliahId, dariTahunAjaranId, tahunAjaranId }, jurusanId) => {
  const mk = await findMataKuliah(mataKuliahId, jurusanId);
  const dariMk = Number(dariMataKuliahId || mk.id);
  if (dariMk === mk.id && Number(dariTahunAjaranId) === Number(tahunAjaranId)) throw new ApiError(400, 'Pilih periode / mata kuliah sumber yang berbeda');
  if (dariMk !== mk.id) await findMataKuliah(dariMk, null);
  await findTahunAjaran(tahunAjaranId);
  const peta = await petaCpmk(dariMk, mk.id);
  const map = (cid) => (peta ? peta.get(cid) ?? null : cid);
  const whereSumber = { mataKuliahId: dariMk, tahunAjaranId: Number(dariTahunAjaranId) };
  const tujuan = { mataKuliahId: mk.id, tahunAjaranId: Number(tahunAjaranId) };

  if (jenis === 'pertemuan') {
    const [sumber, ada] = await Promise.all([
      RpsPertemuan.findAll({ where: whereSumber, order: [['sesi', 'ASC']] }),
      RpsPertemuan.findAll({ where: tujuan, attributes: ['sesi'], raw: true }),
    ]);
    const sesiAda = new Set(ada.map((r) => r.sesi));
    const baru = sumber.filter((s) => !sesiAda.has(s.sesi));
    if (baru.length) {
      await RpsPertemuan.bulkCreate(
        baru.map((s) => ({
          ...tujuan,
          sesi: s.sesi,
          jenisPertemuan: s.jenisPertemuan,
          cpmkIds: s.cpmkIds.map(map).filter(Boolean),
          materi: s.materi,
          ...Object.fromEntries(PERTEMUAN_FIELDS.map((f) => [f, s[f]])),
          bobot: s.bobot,
        }))
      );
    }
    return { disalin: baru.length, dilewati: sumber.length - baru.length };
  }

  // Evaluasi: periode tujuan harus masih kosong (total bobot satu periode = 100%).
  if (await RpsEvaluasi.count({ where: tujuan })) throw new ApiError(400, 'Periode tujuan sudah berisi rencana evaluasi. Hapus dulu bila ingin menyalin.');
  const sumber = await RpsEvaluasi.findAll({ where: whereSumber, order: [['urutan', 'ASC'], ['id', 'ASC']] });
  const sel = sumber.length ? await RpsEvaluasiCpmk.findAll({ where: { rpsEvaluasiId: sumber.map((s) => s.id) } }) : [];
  await sequelize.transaction(async (transaction) => {
    const idBaru = new Map();
    for (const s of [...sumber.filter((x) => !x.parentId), ...sumber.filter((x) => x.parentId)]) {
      const e = await RpsEvaluasi.create(
        { ...tujuan, parentId: s.parentId ? idBaru.get(s.parentId) : null, urutan: s.urutan, metode: s.metode, jenisEvaluasi: s.jenisEvaluasi, bobot: s.bobot },
        { transaction }
      );
      idBaru.set(s.id, e.id);
    }
    const selBaru = sel.map((c) => ({ rpsEvaluasiId: idBaru.get(c.rpsEvaluasiId), cpmkId: map(c.cpmkId), bobot: c.bobot })).filter((c) => c.cpmkId);
    if (selBaru.length) await RpsEvaluasiCpmk.bulkCreate(selBaru, { transaction });
  });
  return { disalin: sumber.filter((s) => !s.parentId).length, dilewati: 0 };
};

// ---------- Upload Excel rencana pembelajaran ----------
const KOLOM_PERTEMUAN = [
  { header: 'Sesi', key: 'sesi', width: 8 },
  { header: 'Jenis Pertemuan', key: 'jenisPertemuan', width: 16 },
  { header: 'Kode CPMK', key: 'kodeCpmk', width: 20 },
  { header: 'Materi (IND)', key: 'materi', width: 40 },
  { header: 'Materi (ENG)', key: 'materiEn', width: 40 },
  { header: 'Indikator Penilaian', key: 'indikator', width: 36 },
  { header: 'Kriteria & Bentuk Penilaian', key: 'kriteriaPenilaian', width: 36 },
  { header: 'Bentuk Pembelajaran', key: 'bentukPembelajaran', width: 18 },
  { header: 'Metode Pembelajaran', key: 'metodePembelajaran', width: 30 },
  { header: 'Waktu', key: 'waktu', width: 16 },
  { header: 'Bobot (%)', key: 'bobot', width: 10 },
  { header: 'Referensi', key: 'referensi', width: 30 },
];

const templatePertemuan = () =>
  buildWorkbook('Rencana Pembelajaran', KOLOM_PERTEMUAN, [
    {
      sesi: 1,
      jenisPertemuan: 'Kuliah',
      kodeCpmk: 'CPMK-01, SUB-01',
      materi: 'Pengantar mata kuliah',
      materiEn: 'Course introduction',
      indikator: 'Ketepatan menjelaskan konsep dasar',
      kriteriaPenilaian: 'Rubrik; tes lisan',
      bentukPembelajaran: 'Luring',
      metodePembelajaran: 'Ceramah, diskusi',
      waktu: '3 x 50 menit',
      bobot: 5,
      referensi: '[1] Bab 1',
    },
  ]);

/** Import rencana pembelajaran periode tsb dari Excel (baris dengan sesi yang sudah ada → diperbarui). */
const importPertemuan = async (mataKuliahId, tahunAjaranId, file, jurusanId) => {
  const mk = await findMataKuliah(mataKuliahId, jurusanId);
  await findTahunAjaran(tahunAjaranId);
  const rows = await parseWorkbookFromBase64(file);
  const cpmk = await Cpmk.findAll({ where: { mataKuliahId: mk.id }, attributes: ['id', 'kode'], raw: true });
  const idByKode = new Map(cpmk.map((c) => [c.kode.toLowerCase(), c.id]));
  const jenisByTeks = new Map(JENIS_PERTEMUAN.flatMap((j) => [[j.toLowerCase(), j], [JENIS_PERTEMUAN_LABEL[j].toLowerCase(), j]]));
  const errors = [];
  const warnings = [];
  let successCount = 0;
  const sesiFile = new Set();

  for (const { rowNumber, data } of rows) {
    const get = (header) => data[KOLOM_PERTEMUAN.find((k) => k.key === header).header];
    const sesi = Number(get('sesi'));
    if (!Number.isInteger(sesi) || sesi < 1) {
      errors.push({ row: rowNumber, message: 'Sesi wajib berupa angka ≥ 1' });
      continue;
    }
    if (sesiFile.has(sesi)) {
      errors.push({ row: rowNumber, message: `Sesi ${sesi} muncul lebih dari sekali di file` });
      continue;
    }
    const materi = teks(get('materi'));
    if (!materi) {
      errors.push({ row: rowNumber, message: 'Materi (IND) wajib diisi' });
      continue;
    }
    const jenisTeks = teks(get('jenisPertemuan'))?.toLowerCase();
    const jenisPertemuan = jenisTeks ? jenisByTeks.get(jenisTeks) : 'KULIAH';
    if (!jenisPertemuan) {
      errors.push({ row: rowNumber, message: `Jenis Pertemuan "${get('jenisPertemuan')}" tidak dikenal (Kuliah/Praktikum/UTS/UAS/Lainnya)` });
      continue;
    }
    const bobotTeks = teks(get('bobot'));
    const bobot = bobotTeks === null ? null : Number(String(bobotTeks).replace(',', '.'));
    if (bobot !== null && (Number.isNaN(bobot) || bobot < 0 || bobot > 100)) {
      errors.push({ row: rowNumber, message: 'Bobot harus angka 0–100' });
      continue;
    }
    const bentukTeks = teks(get('bentukPembelajaran'))?.toUpperCase() ?? null;
    if (bentukTeks && !BENTUK_PEMBELAJARAN.includes(bentukTeks)) warnings.push({ row: rowNumber, message: `Bentuk Pembelajaran "${get('bentukPembelajaran')}" tidak dikenal (Luring/Daring/Hybrid), dikosongkan` });
    const kodeList = (teks(get('kodeCpmk')) ?? '').split(/[,;]/).map((s) => s.trim()).filter(Boolean);
    const tidakAda = kodeList.filter((k) => !idByKode.has(k.toLowerCase()));
    if (tidakAda.length) warnings.push({ row: rowNumber, message: `Kode CPMK tidak ditemukan & dilewati: ${tidakAda.join(', ')}` });
    const values = {
      mataKuliahId: mk.id,
      tahunAjaranId: Number(tahunAjaranId),
      sesi,
      jenisPertemuan,
      cpmkIds: kodeList.map((k) => idByKode.get(k.toLowerCase())).filter(Boolean),
      materi,
      ...Object.fromEntries(PERTEMUAN_FIELDS.map((f) => [f, teks(get(f))])),
      bentukPembelajaran: bentukTeks && BENTUK_PEMBELAJARAN.includes(bentukTeks) ? bentukTeks : null,
      bobot: bobot === null ? null : bulat2(bobot),
    };
    const ada = await RpsPertemuan.findOne({ where: { mataKuliahId: mk.id, tahunAjaranId: Number(tahunAjaranId), sesi } });
    if (ada) await ada.update(values);
    else await RpsPertemuan.create(values);
    sesiFile.add(sesi);
    successCount += 1;
  }
  return { successCount, errorCount: errors.length, errors, warnings };
};

// ---------- Rencana Evaluasi ----------
/**
 * Simpan seluruh tabel Komponen Evaluasi satu periode (tombol Simpan Data):
 * - items[]: { key, id?, parentKey?, metode, jenisEvaluasi, bobot } — induk = metode evaluasi + bobot (% nilai
 *   akhir); parentKey terisi = sub metode. Item lama yang tidak dikirim dihapus.
 * - cells[]: { evalKey, cpmkId, bobot } — nilai CPMK pada baris daun (sub metode, atau metode tanpa sub).
 * Aturan: total bobot metode = 100% dan nilai CPMK tiap metode (beserta sub-nya) = bobot metode tsb.
 */
const saveEvaluasi = async (mataKuliahId, tahunAjaranId, { items, cells }, jurusanId) => {
  const mk = await findMataKuliah(mataKuliahId, jurusanId);
  await findTahunAjaran(tahunAjaranId);
  const scope = { mataKuliahId: mk.id, tahunAjaranId: Number(tahunAjaranId) };
  const [lama, cpmk] = await Promise.all([
    RpsEvaluasi.findAll({ where: scope, attributes: ['id'], raw: true }),
    Cpmk.findAll({ where: { mataKuliahId: mk.id }, attributes: ['id'], raw: true }),
  ]);
  const idLama = new Set(lama.map((r) => r.id));
  const cpmkIds = new Set(cpmk.map((c) => c.id));

  const byKey = new Map(items.map((i) => [String(i.key), i]));
  const induk = items.filter((i) => !i.parentKey);
  const subOf = (key) => items.filter((i) => String(i.parentKey) === String(key));
  for (const [n, i] of items.entries()) {
    if (i.id && !idLama.has(Number(i.id))) throw new ApiError(400, 'Rencana evaluasi bukan milik periode ini');
    if (i.parentKey) {
      const p = byKey.get(String(i.parentKey));
      if (!p || p.parentKey) throw new ApiError(400, 'Metode induk sub evaluasi tidak valid');
      if (!teks(i.jenisEvaluasi)) throw new ApiError(400, `Jenis evaluasi sub metode baris ${n + 1} wajib diisi`);
    } else if (!i.metode) throw new ApiError(400, 'Metode evaluasi wajib dipilih di semua baris');
  }
  const daun = (key) => {
    const i = byKey.get(String(key));
    return !!i && (!!i.parentKey || !subOf(i.key).length);
  };
  const selValid = cells.filter((c) => Number(c.bobot) > 0);
  if (selValid.some((c) => !daun(c.evalKey) || !cpmkIds.has(Number(c.cpmkId)))) throw new ApiError(400, 'Nilai CPMK hanya boleh diisi pada baris sub metode / metode tanpa sub & CPMK mata kuliah ini');

  if (induk.length) {
    const total = bulat2(induk.reduce((s, i) => s + Number(i.bobot || 0), 0));
    if (Math.abs(total - 100) > 0.01) throw new ApiError(400, `Total bobot evaluasi harus 100% (sekarang ${total}%)`);
  }
  const nilaiBaris = (key) => selValid.filter((c) => String(c.evalKey) === String(key)).reduce((s, c) => s + Number(c.bobot), 0);
  for (const i of induk) {
    const nilai = bulat2(subOf(i.key).length ? subOf(i.key).reduce((s, x) => s + nilaiBaris(x.key), 0) : nilaiBaris(i.key));
    if (Math.abs(nilai - bulat2(i.bobot || 0)) > 0.01) {
      throw new ApiError(400, `Nilai CPMK ${i.metode.replace(/_/g, ' ')} (${nilai}%) harus sama dengan bobot evaluasinya (${bulat2(i.bobot || 0)}%)`);
    }
  }

  await sequelize.transaction(async (transaction) => {
    const dikirim = new Set(items.filter((i) => i.id).map((i) => Number(i.id)));
    const hapus = [...idLama].filter((id) => !dikirim.has(id));
    if (hapus.length) await RpsEvaluasi.destroy({ where: { id: hapus }, transaction });
    const idByKey = new Map();
    const simpan = async (i, urutan, parentId) => {
      const values = {
        ...scope,
        parentId,
        urutan,
        metode: parentId ? null : i.metode,
        jenisEvaluasi: teks(i.jenisEvaluasi),
        bobot: parentId ? 0 : bulat2(i.bobot || 0),
      };
      if (i.id) {
        await RpsEvaluasi.update(values, { where: { id: Number(i.id) }, transaction });
        idByKey.set(String(i.key), Number(i.id));
      } else idByKey.set(String(i.key), (await RpsEvaluasi.create(values, { transaction })).id);
    };
    for (const [n, i] of induk.entries()) {
      await simpan(i, n + 1, null);
      for (const [m, s] of subOf(i.key).entries()) await simpan(s, m + 1, idByKey.get(String(i.key)));
    }
    const semua = [...idByKey.values()];
    if (semua.length) await RpsEvaluasiCpmk.destroy({ where: { rpsEvaluasiId: semua }, transaction });
    if (selValid.length) {
      await RpsEvaluasiCpmk.bulkCreate(
        selValid.map((c) => ({ rpsEvaluasiId: idByKey.get(String(c.evalKey)), cpmkId: Number(c.cpmkId), bobot: bulat2(c.bobot) })),
        { transaction }
      );
    }
  });
  return { jumlah: induk.length };
};

module.exports = {
  JENIS_PERTEMUAN,
  METODE_EVALUASI,
  listMataKuliah,
  getDetail,
  getPeriode,
  saveCpl,
  saveCpmk,
  deleteCpmk,
  salinCpmk,
  savePemetaanCpmk,
  saveRps,
  savePertemuan,
  deletePertemuan,
  salinPeriode,
  templatePertemuan,
  importPertemuan,
  saveEvaluasi,
};
