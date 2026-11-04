const { Op } = require('sequelize');
const { sequelize, CalonMahasiswa, Gelombang, Peserta, PesertaBiodata, SumberInformasi, GolonganKelas, Beasiswa, Jurusan, UkuranAlmamater } = require('../models');
const ApiError = require('../utils/ApiError');
const { getPagination, getPagingMeta } = require('../utils/pagination');
const { resolveOrder } = require('../utils/sorting');
const { hitungStatusDokumen, flagDokumen, syncFlagDokumen } = require('../utils/statusDokumen');

const includeRelations = [
  { model: Gelombang, as: 'gelombang' },
  {
    model: Peserta,
    as: 'peserta',
    attributes: ['id', 'namaLengkap', 'email', 'noTelepon', 'wajibGantiPassword', 'statusUjian', 'statusKelulusan', 'sumberInformasiId', 'golonganKelasId', 'jurusanId', 'beasiswaId'],
    // Data pendidikan (status ikon & popup Data Pendidikan di menu Peserta).
    include: [
      { model: PesertaBiodata, as: 'biodata', attributes: ['id', 'jurusanSekolah', 'tahunLulus', 'jenisPengelolaanSekolah', 'alamatSekolah', 'nisn'] },
      { model: SumberInformasi, as: 'sumberInformasi', attributes: ['id', 'namaInformasi'] },
    ],
  },
  // Popup Sumber Informasi.
  { model: SumberInformasi, as: 'sumberInformasi', attributes: ['id', 'namaInformasi'] },
  // Popup Sumber Informasi 2.
  // required: false — GolonganKelas/Jurusan punya default scope (where), tanpa ini include jadi INNER JOIN.
  { model: GolonganKelas, as: 'golonganKelas', attributes: ['id', 'namaKelas'], required: false },
  { model: Beasiswa, as: 'beasiswa', attributes: ['id', 'namaBeasiswa'], required: false },
  { model: Jurusan.scope('withDeleted'), as: 'jurusan1', attributes: ['id', 'namaJurusan', 'jenjangPendidikan'], required: false },
  { model: Jurusan.scope('withDeleted'), as: 'jurusan2', attributes: ['id', 'namaJurusan', 'jenjangPendidikan'], required: false },
  { model: Jurusan.scope('withDeleted'), as: 'jurusan3', attributes: ['id', 'namaJurusan', 'jenjangPendidikan'], required: false },
];

/**
 * Saat sebuah baris CalonMahasiswa ditautkan ke Peserta (pesertaId terisi), status kelulusan
 * yang ditampilkan HARUS mengikuti data Peserta yang sebenarnya (bukan input manual lama),
 * supaya dua sumber status tidak lagi bisa berbeda untuk baris yang sudah ditautkan.
 */
const withDerivedStatus = (row) => {
  const plain = row.toJSON ? row.toJSON() : row;
  if (plain.peserta) {
    plain.lulusTesMasuk = plain.peserta.statusUjian === 'lulus';
    plain.statusKuliah = plain.peserta.statusKelulusan;
  }
  return plain;
};

/** withDerivedStatus + Formulir Pendaftaran / Kelengkapan Persyaratan dari dokumen yang diupload peserta. */
const withDerivedRows = async (rows) => {
  const plains = rows.map(withDerivedStatus);
  const status = await hitungStatusDokumen(plains.map((p) => p.pesertaId));
  return plains.map((p) => {
    const s = p.pesertaId ? status.get(p.pesertaId) : null;
    if (!s) return p;
    // dokumen*Lengkap: warna ikon tombol Dokumen Pendaftaran / Dokumen Pendaftaran 2 di menu Peserta.
    return { ...p, ...flagDokumen(s, p.skemaPembiayaan), dokumenUmumLengkap: s.umum, dokumenBeasiswaLengkap: s.beasiswa };
  });
};

/**
 * Saat menautkan/mengubah baris yang tertaut, simpan juga nilai turunan ke kolom asli
 * supaya query agregat (getStats) yang membaca kolom langsung tetap akurat tanpa perlu
 * join, bukan hanya bergantung pada override saat pembacaan.
 */
const syncDerivedStatusOnWrite = async (payload) => {
  if (!payload.pesertaId) return payload;
  const peserta = await Peserta.findByPk(payload.pesertaId);
  if (!peserta) throw new ApiError(404, 'Peserta not found');
  return { ...payload, lulusTesMasuk: peserta.statusUjian === 'lulus', statusKuliah: peserta.statusKelulusan };
};

const SORTABLE_COLUMNS = {
  nama: ['nama'],
  asalSekolah: ['asalSekolah'],
  prodi: ['prodi'],
  gelombang: [{ model: Gelombang, as: 'gelombang' }, 'namaGelombang'],
  skemaPembiayaan: ['skemaPembiayaan'],
  formulirPendaftaran: ['formulirPendaftaran'],
  lulusTesMasuk: ['lulusTesMasuk'],
  akunBeasiswa: ['akunBeasiswa'],
  kelengkapanPersyaratan: ['kelengkapanPersyaratan'],
  statusBeasiswa: ['statusBeasiswa'],
  statusKuliah: ['statusKuliah'],
};

const listCalonMahasiswa = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const where = {};
  if (query.search) {
    where[Op.or] = [
      { nama: { [Op.like]: `%${query.search}%` } },
      { asalSekolah: { [Op.like]: `%${query.search}%` } },
    ];
  }
  if (query.statusKuliah) {
    where.statusKuliah = query.statusKuliah;
  }
  if (query.skemaPembiayaan) {
    where.skemaPembiayaan = query.skemaPembiayaan;
  }
  if (query.gelombangId) {
    where.gelombangId = query.gelombangId;
  }
  // Jurusan = nama prodi pilihan (unik per nama; master jurusan punya varian per golongan kelas).
  if (query.prodi) {
    where.prodi = query.prodi;
  }
  // Tahun PMB = tahun akun pendaftar (sama dengan Reporting) atau tahun gelombangnya; golongan kelas = kelas akun peserta.
  if (query.tahunPmbId) {
    const tahunPmbId = Number(query.tahunPmbId);
    const [akun, gelombang] = await Promise.all([
      Peserta.findAll({ where: { tahunPmbId }, attributes: ['id'], raw: true }),
      Gelombang.findAll({ where: { tahunPmbId }, attributes: ['id'], raw: true }),
    ]);
    where[Op.and] = [{ [Op.or]: [{ pesertaId: akun.map((a) => a.id) }, { gelombangId: gelombang.map((g) => g.id) }] }];
  }
  const include = includeRelations.map((r) => {
    if (r.as === 'peserta' && query.golonganKelasId) return { ...r, where: { golonganKelasId: Number(query.golonganKelasId) }, required: true };
    return r;
  });

  const { rows, count } = await CalonMahasiswa.findAndCountAll({
    where,
    include,
    limit,
    offset,
    order: resolveOrder(query, SORTABLE_COLUMNS),
    subQuery: false,
    distinct: true,
  });
  return { data: await withDerivedRows(rows), meta: getPagingMeta(count, page, limit) };
};

const getCalonMahasiswaByIdRaw = async (id) => {
  const calonMahasiswa = await CalonMahasiswa.findByPk(id, { include: includeRelations });
  if (!calonMahasiswa) throw new ApiError(404, 'Calon mahasiswa not found');
  return calonMahasiswa;
};

const getCalonMahasiswaById = async (id) => (await withDerivedRows([await getCalonMahasiswaByIdRaw(id)]))[0];

/** Setiap baris menu Peserta milik satu akun; akun yang sudah punya baris memakai baris itu, tidak membuat baris kedua. */
const createCalonMahasiswa = async (payload, actorId) => {
  if (!payload.pesertaId) throw new ApiError(400, 'Data peserta harus memiliki akun: buat akun baru atau tautkan akun yang sudah ada');
  const ada = await CalonMahasiswa.findOne({ where: { pesertaId: payload.pesertaId }, order: [['id', 'ASC']] });
  if (ada) return updateCalonMahasiswa(ada.id, payload, actorId);
  const finalPayload = await syncDerivedStatusOnWrite(payload);
  const calonMahasiswa = await CalonMahasiswa.create({ ...finalPayload, createdBy: actorId, updatedBy: actorId });
  await syncFlagDokumen(calonMahasiswa.pesertaId);
  return getCalonMahasiswaById(calonMahasiswa.id);
};

const updateCalonMahasiswa = async (id, payload, actorId) => {
  const calonMahasiswa = await getCalonMahasiswaByIdRaw(id);
  if (payload.pesertaId && payload.pesertaId !== calonMahasiswa.pesertaId) {
    const dipakai = await CalonMahasiswa.findOne({ where: { pesertaId: payload.pesertaId, id: { [Op.ne]: calonMahasiswa.id } } });
    if (dipakai) throw new ApiError(409, `Akun ini sudah dipakai data peserta ${dipakai.nama}`);
  }
  const finalPayload = await syncDerivedStatusOnWrite({ pesertaId: calonMahasiswa.pesertaId, ...payload });
  await calonMahasiswa.update({ ...finalPayload, updatedBy: actorId });
  // Prodi diubah di menu Peserta: jurusan akun ikut (varian golongan kelas akun), supaya Reporting & Dashboard sama.
  if (calonMahasiswa.pesertaId && payload.prodi) {
    const akun = await Peserta.findByPk(calonMahasiswa.pesertaId, { attributes: ['id', 'golonganKelasId', 'jurusanId'] });
    const jurusan = akun && (await Jurusan.findOne({ where: { namaJurusan: payload.prodi, golonganKelasId: akun.golonganKelasId }, attributes: ['id'] }));
    if (jurusan && jurusan.id !== akun.jurusanId) await akun.update({ jurusanId: jurusan.id });
  }
  await syncFlagDokumen(calonMahasiswa.pesertaId);
  return getCalonMahasiswaById(id);
};

const deleteCalonMahasiswa = async (id) => {
  const calonMahasiswa = await getCalonMahasiswaByIdRaw(id);
  await calonMahasiswa.destroy();
};

/**
 * Simpan Data Pendidikan dari menu Peserta. Nama asal sekolah disimpan di baris ini (dan akun peserta bila ditautkan);
 * jurusan / tahun lulus / pengelolaan / alamat sekolah / NISN disimpan di biodata peserta, jadi butuh akun peserta
 * yang sudah memiliki biodata.
 */
const savePendidikan = async (id, { asalSekolah, ...pendidikan }, actorId) => {
  const calon = await getCalonMahasiswaByIdRaw(id);
  const adaIsian = Object.values(pendidikan).some((v) => v);
  if (!calon.pesertaId && adaIsian) {
    throw new ApiError(400, 'Data ini belum ditautkan ke akun peserta. Hanya nama asal sekolah yang bisa disimpan.');
  }
  const isian = Object.fromEntries(Object.entries(pendidikan).map(([k, v]) => [k, v || null]));
  await sequelize.transaction(async (transaction) => {
    await calon.update({ asalSekolah, updatedBy: actorId }, { transaction });
    if (!calon.pesertaId) return;
    await Peserta.update({ asalSekolah }, { where: { id: calon.pesertaId }, transaction });
    const biodata = await PesertaBiodata.findOne({ where: { pesertaId: calon.pesertaId }, transaction });
    // Biodata belum ada: dibuat dengan data pendidikan saja (biodata pribadi dilengkapi peserta / admin nanti).
    if (biodata) await biodata.update(isian, { transaction });
    else if (adaIsian) await PesertaBiodata.create({ ...isian, pesertaId: calon.pesertaId, isAgree: false, isLocked: false }, { transaction });
  });
  return getCalonMahasiswaById(id);
};

/**
 * Simpan popup Sumber Informasi (menu Data Calon Mahasiswa). Ditolak bila data sedang terkunci. Sumber informasi baris
 * yang tertaut ke akun peserta ikut disimpan ke peserta (pilihan saat mendaftar) supaya statistik konsisten.
 */
const saveSumberInformasi = async (id, { sumberInformasiId, keteranganSumber, kodeUnik }, actorId) => {
  const calon = await getCalonMahasiswaByIdRaw(id);
  if (calon.sumberTerkunci) throw new ApiError(400, 'Data sumber informasi terkunci. Buka kunci data terlebih dahulu.');
  if (sumberInformasiId && !(await SumberInformasi.findByPk(sumberInformasiId))) throw new ApiError(400, 'Sumber informasi tidak ditemukan');
  await sequelize.transaction(async (transaction) => {
    await calon.update({ sumberInformasiId: sumberInformasiId || null, keteranganSumber: keteranganSumber || null, kodeUnik: kodeUnik || null, updatedBy: actorId }, { transaction });
    if (calon.pesertaId && sumberInformasiId) await Peserta.update({ sumberInformasiId }, { where: { id: calon.pesertaId }, transaction });
  });
  return getCalonMahasiswaById(id);
};

/** Kunci / buka kunci data sumber informasi (terkunci = hanya bisa dibaca). */
const setKunciSumber = async (id, terkunci, actorId) => {
  const calon = await getCalonMahasiswaByIdRaw(id);
  await calon.update({ sumberTerkunci: !!terkunci, updatedBy: actorId });
  return getCalonMahasiswaById(id);
};

/**
 * Simpan popup Sumber Informasi 2: kelas perkuliahan, skema pembayaran (beasiswa; kosong = mandiri), ukuran almamater,
 * gelombang, jurusan pilihan 1–3. Ditolak bila terkunci. Jurusan 1 menjadi prodi baris ini; baris yang tertaut ke akun
 * peserta ikut menyimpan kelas, jurusan 1, dan beasiswa ke peserta supaya pilihan pendaftaran tetap sama.
 */
const saveDataPmb = async (id, payload, actorId) => {
  const calon = await getCalonMahasiswaByIdRaw(id);
  if (calon.dataPmbTerkunci) throw new ApiError(400, 'Data pendaftaran terkunci. Buka kunci data terlebih dahulu.');
  const { golonganKelasId, beasiswaId, ukuranAlmamater, gelombangId, jurusan1Id, jurusan2Id, jurusan3Id } = payload;
  if (golonganKelasId && !(await GolonganKelas.findByPk(golonganKelasId))) throw new ApiError(400, 'Kelas perkuliahan tidak ditemukan');
  if (beasiswaId && !(await Beasiswa.findByPk(beasiswaId))) throw new ApiError(400, 'Beasiswa tidak ditemukan');
  if (gelombangId && !(await Gelombang.findByPk(gelombangId))) throw new ApiError(400, 'Gelombang tidak ditemukan');
  const jurusanIds = [jurusan1Id, jurusan2Id, jurusan3Id].filter(Boolean);
  if (new Set(jurusanIds).size !== jurusanIds.length) throw new ApiError(400, 'Jurusan 1, 2, dan 3 tidak boleh sama');
  const jurusanList = jurusanIds.length ? await Jurusan.findAll({ where: { id: jurusanIds } }) : [];
  if (jurusanList.length !== jurusanIds.length) throw new ApiError(400, 'Jurusan tidak ditemukan');
  if (golonganKelasId && jurusanList.some((j) => j.golonganKelasId !== golonganKelasId)) {
    throw new ApiError(400, 'Jurusan harus sesuai kelas perkuliahan yang dipilih');
  }
  const jurusan1 = jurusanList.find((j) => j.id === jurusan1Id);

  await sequelize.transaction(async (transaction) => {
    await calon.update(
      {
        golonganKelasId: golonganKelasId || null,
        beasiswaId: beasiswaId || null,
        skemaPembiayaan: beasiswaId ? 'beasiswa' : 'mandiri',
        ukuranAlmamater: ukuranAlmamater || null,
        gelombangId: gelombangId || null,
        jurusan1Id: jurusan1Id || null,
        jurusan2Id: jurusan2Id || null,
        jurusan3Id: jurusan3Id || null,
        ...(jurusan1 ? { prodi: jurusan1.namaJurusan } : {}),
        updatedBy: actorId,
      },
      { transaction }
    );
    if (calon.pesertaId) {
      const pesertaUpdate = { beasiswaId: beasiswaId || null };
      if (golonganKelasId && jurusan1) Object.assign(pesertaUpdate, { golonganKelasId, jurusanId: jurusan1.id });
      await Peserta.update(pesertaUpdate, { where: { id: calon.pesertaId }, transaction });
    }
  });
  // Skema pembiayaan bisa berubah → Kelengkapan Persyaratan ikut dihitung ulang.
  await syncFlagDokumen(calon.pesertaId);
  return getCalonMahasiswaById(id);
};

/** Kunci / buka kunci data popup Sumber Informasi 2 (terkunci = hanya bisa dibaca). */
const setKunciDataPmb = async (id, terkunci, actorId) => {
  const calon = await getCalonMahasiswaByIdRaw(id);
  await calon.update({ dataPmbTerkunci: !!terkunci, updatedBy: actorId });
  return getCalonMahasiswaById(id);
};

/**
 * Portal peserta (halaman Sumber Informasi 2): isian popup Sumber Informasi 2 milik peserta yang login + opsi pilihannya.
 * Isian kosong diambil dari pilihan saat mendaftar (kelas, jurusan 1, beasiswa) — sama seperti popup admin.
 */
const getDataPmbPeserta = async (pesertaId) => {
  const peserta = await Peserta.findByPk(pesertaId);
  if (!peserta) throw new ApiError(404, 'Peserta not found');
  const calon = await CalonMahasiswa.findOne({ where: { pesertaId }, order: [['id', 'ASC']] });
  const [kelas, beasiswa, gelombang, ukuran, jurusan, sumber] = await Promise.all([
    GolonganKelas.findAll({ attributes: ['id', 'namaKelas'], order: [['id', 'ASC']] }),
    Beasiswa.findAll({ where: { isActive: true }, attributes: ['id', 'namaBeasiswa'], order: [['orderNumber', 'ASC']] }),
    Gelombang.findAll({ where: peserta.tahunPmbId ? { tahunPmbId: peserta.tahunPmbId } : {}, attributes: ['id', 'namaGelombang'], order: [['startDate', 'ASC']] }),
    UkuranAlmamater.findAll({ attributes: ['id', 'ukuran'], order: [['id', 'ASC']] }),
    Jurusan.findAll({ attributes: ['id', 'namaJurusan', 'jenjangPendidikan', 'golonganKelasId'], order: [['namaJurusan', 'ASC']] }),
    SumberInformasi.findAll({ attributes: ['id', 'namaInformasi'], order: [['id', 'ASC']] }),
  ]);
  return {
    terkunci: !!calon?.dataPmbTerkunci,
    // Sudah pernah disimpan (bukan sekadar isian awal dari pilihan saat mendaftar) → centang di menu peserta.
    tersimpan: !!(calon?.golonganKelasId && calon?.jurusan1Id),
    golonganKelasId: calon?.golonganKelasId ?? peserta.golonganKelasId,
    beasiswaId: calon?.beasiswaId ?? peserta.beasiswaId,
    ukuranAlmamater: calon?.ukuranAlmamater ?? null,
    gelombangId: calon?.gelombangId ?? null,
    jurusan1Id: calon?.jurusan1Id ?? peserta.jurusanId,
    jurusan2Id: calon?.jurusan2Id ?? null,
    jurusan3Id: calon?.jurusan3Id ?? null,
    // Popup Sumber Informasi (admin) yang juga bisa diisi peserta; kuncinya terpisah dari data di atas.
    sumber: {
      sumberInformasiId: calon?.sumberInformasiId ?? peserta.sumberInformasiId ?? null,
      keteranganSumber: calon?.keteranganSumber ?? null,
      kodeUnik: calon?.kodeUnik ?? null,
      terkunci: !!calon?.sumberTerkunci,
    },
    opsi: { kelas, beasiswa, gelombang, ukuran, jurusan, sumber },
  };
};

/** Simpan Sumber Informasi 2 dari portal peserta. Belum ada baris di menu Peserta → dibuat & ditautkan ke akun ini. */
/** Perubahan akun pendaftar (Reporting, portal peserta, form akun) ikut ke baris menu Peserta miliknya. */
const selaraskanDariAkun = async (pesertaId, perubahan) => {
  const isian = {};
  if (perubahan.namaLengkap) isian.nama = perubahan.namaLengkap;
  if (perubahan.asalSekolah) isian.asalSekolah = perubahan.asalSekolah;
  if (perubahan.noTelepon) isian.noTelepon = perubahan.noTelepon;
  if (perubahan.sumberInformasiId !== undefined) isian.sumberInformasiId = perubahan.sumberInformasiId;
  if (perubahan.statusUjian) isian.lulusTesMasuk = perubahan.statusUjian === 'lulus';
  if (perubahan.statusKelulusan) isian.statusKuliah = perubahan.statusKelulusan;
  if (perubahan.beasiswaId !== undefined) Object.assign(isian, { beasiswaId: perubahan.beasiswaId, skemaPembiayaan: perubahan.beasiswaId ? 'beasiswa' : 'mandiri' });
  if (perubahan.jurusanId) {
    const jurusan = await Jurusan.scope('withDeleted').findByPk(perubahan.jurusanId, { attributes: ['namaJurusan'] });
    if (jurusan) isian.prodi = jurusan.namaJurusan;
  }
  if (!Object.keys(isian).length) return;
  await CalonMahasiswa.update(isian, { where: { pesertaId } });
  await syncFlagDokumen(pesertaId);
};

/** Baris menu Peserta milik satu akun pendaftar; dibuat dari data akun bila belum ada. */
const pastikanBarisPeserta = async (pesertaId) => {
  const calon = await CalonMahasiswa.findOne({ where: { pesertaId }, order: [['id', 'ASC']] });
  if (calon) return calon;
  const peserta = await Peserta.findByPk(pesertaId, { include: [{ model: Jurusan.scope('withDeleted'), as: 'jurusan', required: false }] });
  if (!peserta) throw new ApiError(404, 'Peserta not found');
  return CalonMahasiswa.create(
    await syncDerivedStatusOnWrite({
      pesertaId,
      nama: peserta.namaLengkap,
      asalSekolah: peserta.asalSekolah || '-',
      prodi: peserta.jurusan?.namaJurusan ?? '-',
      noTelepon: peserta.noTelepon,
      sumberInformasiId: peserta.sumberInformasiId,
    })
  );
};

const saveDataPmbPeserta = async (pesertaId, payload) => {
  const calon = await pastikanBarisPeserta(pesertaId);
  await saveDataPmb(calon.id, payload, null);
  return getDataPmbPeserta(pesertaId);
};

/** Simpan Sumber Informasi dari portal peserta (isian sama dengan popup admin). Ditolak bila dikunci panitia. */
const saveSumberInformasiPeserta = async (pesertaId, payload) => {
  const calon = await pastikanBarisPeserta(pesertaId);
  if (calon.sumberTerkunci) throw new ApiError(403, 'Sumber informasi sudah dikunci panitia PMB dan hanya bisa dilihat.');
  if (!payload.sumberInformasiId) throw new ApiError(400, 'Pilih dari mana Anda mendapat informasi kampus.');
  await saveSumberInformasi(calon.id, payload, null);
  return getDataPmbPeserta(pesertaId);
};

const getStats = async (query = {}) => {
  const base = query.gelombangId ? { gelombangId: query.gelombangId } : {};
  const [totalPendaftar, diterimaKuliah, ditolak, jalurBeasiswa, beasiswaDiterima] = await Promise.all([
    CalonMahasiswa.count({ where: base }),
    CalonMahasiswa.count({ where: { ...base, statusKuliah: 'diterima' } }),
    CalonMahasiswa.count({ where: { ...base, statusKuliah: 'ditolak' } }),
    CalonMahasiswa.count({ where: { ...base, skemaPembiayaan: 'beasiswa' } }),
    CalonMahasiswa.count({ where: { ...base, statusBeasiswa: 'disetujui' } }),
  ]);

  return { totalPendaftar, diterimaKuliah, ditolak, jalurBeasiswa, beasiswaDiterima };
};

/**
 * Endpoint publik: pakai derived status yang sama, tapi JANGAN pernah expose identitas
 * Peserta yang ditautkan (nama asli/email akun) ke publik tanpa autentikasi.
 */
const listPublicCalonMahasiswa = async (query) => {
  const { data, meta } = await listCalonMahasiswa(query);
  return { data: data.map(({ peserta, ...rest }) => rest), meta };
};
const getPublicStats = (query) => getStats(query);

module.exports = {
  listCalonMahasiswa,
  getCalonMahasiswaById,
  createCalonMahasiswa,
  updateCalonMahasiswa,
  deleteCalonMahasiswa,
  savePendidikan,
  saveSumberInformasi,
  setKunciSumber,
  saveDataPmb,
  setKunciDataPmb,
  getDataPmbPeserta,
  saveDataPmbPeserta,
  saveSumberInformasiPeserta,
  pastikanBarisPeserta,
  selaraskanDariAkun,
  getStats,
  listPublicCalonMahasiswa,
  getPublicStats,
};
