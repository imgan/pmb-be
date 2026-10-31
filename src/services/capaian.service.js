const { Op } = require('sequelize');
const { sequelize, Kurikulum, Jurusan, MataKuliah, ProfilLulusan, Cpl, PlCpl, CplMataKuliah } = require('../models');
const ApiError = require('../utils/ApiError');
const { buildWorkbook } = require('../utils/excel');
const { loadKaprodi } = require('../utils/kaprodi');

/**
 * Manajemen Capaian (OBE) per kurikulum: Profil Lulusan (PL), CPL, pemetaan PL → CPL & CPL → MK.
 * Status pengisian: jumlah PL & CPL, % PL yang sudah dipetakan ke CPL, % CPL yang sudah dipetakan ke MK.
 * CPL bisa punya sub-item Indikator Kinerja (IK, cpl.parent_id) — hitungan & pemetaan PL → CPL hanya CPL induk;
 * pemetaan CPL → MK bisa level CPL atau IK (kurikulum.level_pemetaan_cpl_mk).
 * Jenis kurikulum = OBE bila memiliki minimal satu mata kuliah OBE. Data dibatasi prodi sesi lewat
 * `query.jurusanId` (prodiScope).
 */

const ASPEK_CPL = ['SIKAP', 'PENGETAHUAN', 'KETERAMPILAN_UMUM', 'KETERAMPILAN_KHUSUS'];
const persen = (bagian, total) => (total ? Math.round((bagian / total) * 100) : 0);

/** Statistik pengisian per kurikulum (satu query per jenis hitungan). */
const statistik = async (kurikulumIds) => {
  if (!kurikulumIds.length) return new Map();
  const q = (sql) => sequelize.query(sql, { replacements: { ids: kurikulumIds }, type: sequelize.QueryTypes.SELECT });
  const [pl, cpl, plMapped, cplMapped, mk] = await Promise.all([
    q('SELECT kurikulum_id AS k, COUNT(*) AS n FROM profil_lulusan WHERE kurikulum_id IN (:ids) GROUP BY kurikulum_id'),
    q('SELECT kurikulum_id AS k, COUNT(*) AS n FROM cpl WHERE parent_id IS NULL AND kurikulum_id IN (:ids) GROUP BY kurikulum_id'),
    q(`SELECT p.kurikulum_id AS k, COUNT(DISTINCT p.id) AS n FROM profil_lulusan p JOIN pl_cpl x ON x.profil_lulusan_id = p.id
        WHERE p.kurikulum_id IN (:ids) GROUP BY p.kurikulum_id`),
    // CPL induk terpetakan bila dirinya atau salah satu IK-nya dipetakan ke MK (level IK).
    q(`SELECT c.kurikulum_id AS k, COUNT(DISTINCT COALESCE(c.parent_id, c.id)) AS n FROM cpl c JOIN cpl_mata_kuliah x ON x.cpl_id = c.id
         JOIN mata_kuliah m ON m.id = x.mata_kuliah_id AND m.is_delete = 0
        WHERE c.kurikulum_id IN (:ids) GROUP BY c.kurikulum_id`),
    q(`SELECT kurikulum_id AS k, COUNT(*) AS n, SUM(is_obe = 1) AS obe FROM mata_kuliah
        WHERE is_delete = 0 AND kurikulum_id IN (:ids) GROUP BY kurikulum_id`),
  ]);
  const by = (rows, field = 'n') => new Map(rows.map((r) => [Number(r.k), Number(r[field] ?? 0)]));
  const [mPl, mCpl, mPlMapped, mCplMapped, mMk, mObe] = [by(pl), by(cpl), by(plMapped), by(cplMapped), by(mk), by(mk, 'obe')];
  return new Map(
    kurikulumIds.map((id) => {
      const jumlahPl = mPl.get(id) ?? 0;
      const jumlahCpl = mCpl.get(id) ?? 0;
      return [
        id,
        {
          jumlahPl,
          jumlahCpl,
          plCplPersen: persen(mPlMapped.get(id) ?? 0, jumlahPl),
          cplMkPersen: persen(mCplMapped.get(id) ?? 0, jumlahCpl),
          jumlahMataKuliah: mMk.get(id) ?? 0,
          jumlahMkObe: mObe.get(id) ?? 0,
          isObe: (mObe.get(id) ?? 0) > 0,
        },
      ];
    })
  );
};

/** Daftar kurikulum + status pengisian (filter tahunKurikulum, jenjang, jurusanId, jenis = OBE|NON_OBE). */
const listCapaian = async (query = {}) => {
  const where = {};
  if (query.tahunKurikulum) where.tahunKurikulum = Number(query.tahunKurikulum);
  if (query.jurusanId) where.jurusanId = [].concat(query.jurusanId).map(Number);
  const whereJurusan = query.jenjang ? { jenjangPendidikan: query.jenjang } : null;

  const kurikulumList = await Kurikulum.findAll({
    where,
    include: [
      {
        model: Jurusan,
        as: 'jurusan',
        attributes: ['id', 'namaJurusan', 'kodeProdi', 'jenjangPendidikan'],
        required: !!whereJurusan,
        ...(whereJurusan ? { where: whereJurusan } : {}),
      },
    ],
    order: [['tahunKurikulum', 'DESC'], ['nama', 'ASC']],
  });
  const stat = await statistik(kurikulumList.map((k) => k.id));

  const kaprodiCache = new Map();
  const kaprodiOf = async (kodeProdi) => {
    if (!kodeProdi) return null;
    if (!kaprodiCache.has(kodeProdi)) kaprodiCache.set(kodeProdi, (await loadKaprodi(kodeProdi))?.nama ?? null);
    return kaprodiCache.get(kodeProdi);
  };

  let rows = [];
  for (const k of kurikulumList) {
    rows.push({
      id: k.id,
      nama: k.nama,
      tahunKurikulum: k.tahunKurikulum,
      isActive: k.isActive,
      jurusanId: k.jurusanId,
      prodi: k.jurusan?.namaJurusan ?? null,
      jenjang: k.jurusan?.jenjangPendidikan ?? null,
      ketuaProdi: await kaprodiOf(k.jurusan?.kodeProdi),
      ...stat.get(k.id),
    });
  }
  if (query.jenis === 'OBE') rows = rows.filter((r) => r.isObe);
  if (query.jenis === 'NON_OBE') rows = rows.filter((r) => !r.isObe);
  return rows;
};

/** Pilihan filter: tahun kurikulum & jenjang yang ada. */
const getFilterOptions = async () => {
  const [tahun, jenjang] = await Promise.all([
    sequelize.query('SELECT DISTINCT tahun_kurikulum AS t FROM kurikulum WHERE is_delete = 0 AND tahun_kurikulum IS NOT NULL ORDER BY t DESC', {
      type: sequelize.QueryTypes.SELECT,
    }),
    sequelize.query('SELECT DISTINCT jenjang_pendidikan AS j FROM jurusan WHERE jenjang_pendidikan IS NOT NULL ORDER BY j', {
      type: sequelize.QueryTypes.SELECT,
    }),
  ]);
  return { tahunKurikulum: tahun.map((r) => Number(r.t)), jenjang: jenjang.map((r) => r.j) };
};

/** Kurikulum dalam scope prodi sesi (jurusanId dari prodiScope). */
const findKurikulum = async (kurikulumId, jurusanId) => {
  const kurikulum = await Kurikulum.findByPk(kurikulumId, {
    include: [{ model: Jurusan, as: 'jurusan', attributes: ['id', 'namaJurusan', 'kodeProdi', 'jenjangPendidikan'], required: false }],
  });
  if (!kurikulum) throw new ApiError(404, 'Kurikulum tidak ditemukan');
  const scope = jurusanId ? [].concat(jurusanId).map(Number) : null;
  if (scope && !scope.includes(kurikulum.jurusanId)) throw new ApiError(403, 'Kurikulum ini bukan milik prodi Anda');
  return kurikulum;
};

/** Detail capaian satu kurikulum: PL, CPL, MK, dan semua pemetaannya. */
const getDetail = async (kurikulumId, jurusanId) => {
  const kurikulum = await findKurikulum(kurikulumId, jurusanId);
  const [profilLulusan, cpl, mataKuliah] = await Promise.all([
    ProfilLulusan.findAll({ where: { kurikulumId: kurikulum.id }, order: [['kode', 'ASC']] }),
    Cpl.findAll({ where: { kurikulumId: kurikulum.id }, order: [['kode', 'ASC'], ['id', 'ASC']] }),
    MataKuliah.findAll({
      where: { kurikulumId: kurikulum.id },
      attributes: [...MataKuliah.ATTRS_RINGKAS, 'isObe'],
      order: [['semester', 'ASC'], ['kode', 'ASC']],
    }),
  ]);
  const [plCpl, cplMk] = await Promise.all([
    profilLulusan.length ? PlCpl.findAll({ where: { profilLulusanId: profilLulusan.map((p) => p.id) }, raw: true }) : [],
    cpl.length ? CplMataKuliah.findAll({ where: { cplId: cpl.map((c) => c.id) }, raw: true }) : [],
  ]);
  const stat = (await statistik([kurikulum.id])).get(kurikulum.id);
  return {
    kurikulum: {
      id: kurikulum.id,
      nama: kurikulum.nama,
      tahunKurikulum: kurikulum.tahunKurikulum,
      kodeProdi: kurikulum.jurusan?.kodeProdi ?? null,
      prodi: kurikulum.jurusan?.namaJurusan ?? null,
      jenjang: kurikulum.jurusan?.jenjangPendidikan ?? null,
      ketuaProdi: (await loadKaprodi(kurikulum.jurusan?.kodeProdi))?.nama ?? null,
      metodeBobotPlCpl: kurikulum.metodeBobotPlCpl,
      levelPemetaanCplMk: kurikulum.levelPemetaanCplMk,
      ...stat,
    },
    profilLulusan,
    cpl,
    mataKuliah: mataKuliah.map((m) => ({ id: m.id, kode: m.kode, mataKuliah: m.mataKuliah, semester: m.semester, sksTotal: m.sksTotal, isObe: m.isObe })),
    plCpl: plCpl.map((r) => ({ profilLulusanId: r.profilLulusanId, cplId: r.cplId, bobot: Number(r.bobot) })),
    cplMk: cplMk.map((r) => ({ cplId: r.cplId, mataKuliahId: r.mataKuliahId })),
  };
};

// ---------- CRUD Profil Lulusan & CPL ----------
const MODELS = { pl: ProfilLulusan, cpl: Cpl };
const LABEL = { pl: 'Profil lulusan', cpl: 'CPL' };

const saveItem = async (jenis, kurikulumId, payload, jurusanId, id = null) => {
  const Model = MODELS[jenis];
  await findKurikulum(kurikulumId, jurusanId);
  const kode = String(payload.kode).trim();
  const dobel = await Model.findOne({ where: { kurikulumId, kode, ...(id ? { id: { [Op.ne]: id } } : {}) } });
  if (dobel) throw new ApiError(400, `Kode ${kode} sudah dipakai di kurikulum ini`);
  const item = id ? await Model.findOne({ where: { id, kurikulumId } }) : null;
  if (id && !item) throw new ApiError(404, `${LABEL[jenis]} tidak ditemukan`);

  let cplValues = {};
  if (jenis === 'cpl') {
    // Indikator (IK): induk harus CPL (bukan IK) di kurikulum yang sama. Induk tidak bisa diganti saat ubah.
    const parentId = item ? item.parentId : payload.parentId || null;
    if (parentId) {
      const induk = await Cpl.findOne({ where: { id: parentId, kurikulumId } });
      if (!induk || induk.parentId) throw new ApiError(400, 'CPL induk tidak valid');
    }
    cplValues = { parentId, aspek: payload.aspek || null };
  }
  const values = {
    kurikulumId,
    kode,
    deskripsi: String(payload.deskripsi).trim(),
    deskripsiEn: payload.deskripsiEn?.trim() || null,
    ...(jenis === 'cpl' ? cplValues : { nama: String(payload.nama ?? '').trim(), profesi: payload.profesi?.trim() || null }),
  };
  return item ? item.update(values) : Model.create(values);
};

const deleteItem = async (jenis, kurikulumId, id, jurusanId) => {
  await findKurikulum(kurikulumId, jurusanId);
  const item = await MODELS[jenis].findOne({ where: { id, kurikulumId } });
  if (!item) throw new ApiError(404, `${LABEL[jenis]} tidak ditemukan`);
  await item.destroy(); // pemetaan & indikator (IK) ikut terhapus (FK CASCADE)
};

/**
 * Salin Data: salin PL / CPL dari kurikulum lain ke kurikulum ini. Kode yang sudah ada dilewati
 * (tidak menimpa). Pemetaan tidak ikut disalin.
 */
const salinItem = async (jenis, kurikulumId, dariKurikulumId, jurusanId) => {
  if (Number(dariKurikulumId) === Number(kurikulumId)) throw new ApiError(400, 'Pilih kurikulum sumber yang berbeda');
  await findKurikulum(kurikulumId, jurusanId);
  await findKurikulum(dariKurikulumId, null);
  const Model = MODELS[jenis];
  const [sumber, ada] = await Promise.all([
    Model.findAll({ where: { kurikulumId: dariKurikulumId }, order: [['kode', 'ASC']] }),
    Model.findAll({ where: { kurikulumId }, attributes: ['kode'], raw: true }),
  ]);
  const kodeAda = new Set(ada.map((r) => r.kode));
  const baru = sumber.filter((s) => !kodeAda.has(s.kode));
  if (baru.length && jenis === 'pl') {
    const fields = ['kode', 'nama', 'deskripsi', 'deskripsiEn', 'profesi'];
    await Model.bulkCreate(baru.map((s) => ({ kurikulumId, ...Object.fromEntries(fields.map((f) => [f, s[f]])) })));
  }
  if (baru.length && jenis === 'cpl') {
    // CPL induk dulu, lalu indikatornya (parent dipetakan ke id baru / CPL ber-kode sama yang sudah ada).
    const idByKode = new Map((await Cpl.findAll({ where: { kurikulumId }, attributes: ['id', 'kode'], raw: true })).map((r) => [r.kode, r.id]));
    const kodeSumber = new Map(sumber.map((s) => [s.id, s.kode]));
    const fields = ['kode', 'aspek', 'deskripsi', 'deskripsiEn'];
    for (const s of baru.filter((x) => !x.parentId)) {
      const created = await Cpl.create({ kurikulumId, parentId: null, ...Object.fromEntries(fields.map((f) => [f, s[f]])) });
      idByKode.set(created.kode, created.id);
    }
    for (const s of baru.filter((x) => x.parentId)) {
      const parentId = idByKode.get(kodeSumber.get(s.parentId)) ?? null;
      await Cpl.create({ kurikulumId, parentId, ...Object.fromEntries(fields.map((f) => [f, s[f]])) });
    }
  }
  return { disalin: baru.length, dilewati: sumber.length - baru.length };
};

// ---------- Pemetaan (ganti seluruh pasangan satu kurikulum) ----------
/** Bobot rata per PL: 100 ÷ jumlah CPL (2 desimal); sisa pembulatan masuk ke CPL terakhir agar total 100. */
const bobotRata = (pairs) => {
  const perPl = new Map();
  for (const p of pairs) perPl.set(p.profilLulusanId, [...(perPl.get(p.profilLulusanId) ?? []), p]);
  return [...perPl.values()].flatMap((list) => {
    const rata = Math.floor(10000 / list.length) / 100;
    const sisa = Math.round((100 - rata * (list.length - 1)) * 100) / 100;
    return list.map((p, i) => ({ ...p, bobot: i === list.length - 1 ? sisa : rata }));
  });
};

/**
 * Simpan pemetaan PL → CPL + metode pembobotan kurikulum. OTOMATIS: bobot dihitung rata per PL.
 * MANUAL: pasangan berbobot 0/kosong diabaikan; total bobot tiap PL yang dipetakan harus 100.
 */
const savePlCpl = async (kurikulumId, { metode = 'OTOMATIS', pairs }, jurusanId) => {
  const kurikulum = await findKurikulum(kurikulumId, jurusanId);
  const [plKode, cplIds] = await Promise.all([
    ProfilLulusan.findAll({ where: { kurikulumId }, attributes: ['id', 'kode'], raw: true }).then((r) => new Map(r.map((x) => [x.id, x.kode]))),
    Cpl.findAll({ where: { kurikulumId, parentId: null }, attributes: ['id'], raw: true }).then((r) => new Set(r.map((x) => x.id))),
  ]);
  if (pairs.some((p) => !plKode.has(p.profilLulusanId) || !cplIds.has(p.cplId))) throw new ApiError(400, 'Pemetaan hanya boleh berisi PL & CPL induk dari kurikulum ini');
  let rows;
  if (metode === 'MANUAL') {
    rows = pairs.filter((p) => Number(p.bobot) > 0).map((p) => ({ ...p, bobot: Math.round(Number(p.bobot) * 100) / 100 }));
    const total = new Map();
    for (const r of rows) total.set(r.profilLulusanId, (total.get(r.profilLulusanId) ?? 0) + r.bobot);
    const salah = [...total].filter(([, t]) => Math.abs(t - 100) > 0.01).map(([id]) => plKode.get(id));
    if (salah.length) throw new ApiError(400, `Total bobot harus 100% untuk ${salah.join(', ')}`);
  } else {
    rows = bobotRata(pairs);
  }
  await sequelize.transaction(async (transaction) => {
    await kurikulum.update({ metodeBobotPlCpl: metode }, { transaction });
    if (plKode.size) await PlCpl.destroy({ where: { profilLulusanId: [...plKode.keys()] }, transaction });
    if (rows.length) await PlCpl.bulkCreate(rows.map((p) => ({ profilLulusanId: p.profilLulusanId, cplId: p.cplId, bobot: p.bobot })), { transaction });
  });
  return { jumlah: rows.length };
};

/**
 * Simpan pemetaan CPL → MK + level pemetaan kurikulum. Level CPL: hanya CPL induk. Level IK: IK, atau CPL
 * induk yang tidak punya IK. Pemetaan level lain milik kurikulum ini ikut diganti.
 */
const saveCplMk = async (kurikulumId, { level = 'CPL', pairs }, jurusanId) => {
  const kurikulum = await findKurikulum(kurikulumId, jurusanId);
  const [semuaCpl, mkIds] = await Promise.all([
    Cpl.findAll({ where: { kurikulumId }, attributes: ['id', 'parentId'], raw: true }),
    MataKuliah.findAll({ where: { kurikulumId }, attributes: ['id'], raw: true }).then((r) => new Set(r.map((x) => x.id))),
  ]);
  const punyaIk = new Set(semuaCpl.filter((c) => c.parentId).map((c) => c.parentId));
  const boleh = new Set(semuaCpl.filter((c) => (level === 'IK' ? c.parentId || !punyaIk.has(c.id) : !c.parentId)).map((c) => c.id));
  if (pairs.some((p) => !boleh.has(p.cplId) || !mkIds.has(p.mataKuliahId))) {
    throw new ApiError(400, `Pemetaan level ${level} hanya boleh berisi ${level === 'IK' ? 'IK / CPL tanpa IK' : 'CPL induk'} & mata kuliah dari kurikulum ini`);
  }
  await sequelize.transaction(async (transaction) => {
    await kurikulum.update({ levelPemetaanCplMk: level }, { transaction });
    if (semuaCpl.length) await CplMataKuliah.destroy({ where: { cplId: semuaCpl.map((c) => c.id) }, transaction });
    if (pairs.length) await CplMataKuliah.bulkCreate(pairs.map((p) => ({ cplId: p.cplId, mataKuliahId: p.mataKuliahId })), { transaction });
  });
  return { jumlah: pairs.length };
};

/** Laporan (Excel) daftar status pengisian capaian, filter sama dengan daftar. */
const exportLaporan = async (query) => {
  const rows = await listCapaian(query);
  return buildWorkbook(
    'Manajemen Capaian',
    [
      { header: 'Kurikulum', key: 'nama', width: 40 },
      { header: 'Tahun', key: 'tahunKurikulum', width: 8 },
      { header: 'Program Studi', key: 'prodi', width: 32 },
      { header: 'Jenjang', key: 'jenjang', width: 16 },
      { header: 'Jenis Kurikulum', key: 'jenis', width: 14 },
      { header: 'Ketua Program Studi', key: 'ketuaProdi', width: 30 },
      { header: 'PL', key: 'jumlahPl', width: 6 },
      { header: 'CPL', key: 'jumlahCpl', width: 6 },
      { header: 'PL → CPL (%)', key: 'plCplPersen', width: 12 },
      { header: 'CPL → MK (%)', key: 'cplMkPersen', width: 12 },
      { header: 'MK OBE / Total', key: 'mk', width: 14 },
    ],
    rows.map((r) => ({ ...r, jenis: r.isObe ? 'OBE' : 'Non OBE', mk: `${r.jumlahMkObe} / ${r.jumlahMataKuliah}` }))
  );
};

module.exports = { ASPEK_CPL, listCapaian, getFilterOptions, getDetail, saveItem, deleteItem, salinItem, savePlCpl, saveCplMk, exportLaporan };
