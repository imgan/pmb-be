const { Op } = require('sequelize');
const {
  TagihanKuliah,
  PembayaranKuliah,
  Mahasiswa,
  Jurusan,
  GolonganKelas,
  TahunAjaran,
  TarifKuliah,
  DaftarPotongan,
  Krs,
  KrsDetail,
  JadwalKuliah,
} = require('../models');
const ApiError = require('../utils/ApiError');
const { getPagination, getPagingMeta } = require('../utils/pagination');
const { resolveSemesterMahasiswa } = require('../utils/hitungSemester');

const includeRelations = [
  { model: Mahasiswa, as: 'mahasiswa', include: [{ model: Jurusan, as: 'jurusan' }] },
  { model: TahunAjaran, as: 'tahunAjaran' },
];

const withSisa = (tagihan) => {
  const json = tagihan.toJSON ? tagihan.toJSON() : tagihan;
  const totalDibayar = (json.pembayaranList ?? []).reduce((sum, p) => sum + p.nominal, 0);
  return { ...json, totalDibayar, sisaTagihan: Math.max(json.totalTagihan - totalDibayar, 0) };
};

/**
 * Cari tarif kuliah yang berlaku untuk satu mahasiswa. Disederhanakan ke kombinasi
 * jurusanId + tahunAngkatan (= Mahasiswa.tahunMasuk) — tarif kuliah di sistem ini bersifat
 * flat per angkatan (bukan berubah tiap semester berjalan), jadi kolom `semester` &
 * `statusBelajar` pada TarifKuliah TIDAK dipakai sebagai kunci pencarian di sini.
 */
const findTarifKuliah = async (mahasiswa) =>
  TarifKuliah.findOne({
    where: { jurusanId: mahasiswa.jurusanId, tahunAngkatan: mahasiswa.tahunMasuk, isActive: true },
    order: [['id', 'DESC']],
  });

/**
 * KRS (FRS) mahasiswa yang sudah diajukan/disetujui untuk satu tahun ajaran — DRAFT tidak
 * dihitung (mahasiswa belum benar-benar mengunci mata kuliah yang diambil).
 */
const findKrsTerkunci = async (mahasiswaId, tahunAjaranId) =>
  Krs.findOne({
    where: { mahasiswaId, tahunAjaranId, status: { [Op.ne]: 'DRAFT' } },
    include: [
      {
        model: KrsDetail,
        as: 'detailList',
        include: [{ model: JadwalKuliah, as: 'kelasKuliah', attributes: ['id', 'sks'] }],
      },
    ],
    order: [['id', 'DESC']],
  });

/**
 * Generate tagihan kuliah untuk semua mahasiswa aktif pada satu tahun ajaran: (total SKS
 * diambil x harga per SKS) + biaya lain-lain (BPP + SPP dari Master Tarif Kuliah) - potongan.
 *
 * BPP/SPP adalah biaya tetap per semester yang tetap harus ditagihkan meski mahasiswa BELUM
 * mengisi FRS/KRS — hanya komponen biaya SKS yang bergantung pada KRS (mahasiswa tanpa KRS
 * terkunci ditagih dengan sksDiambil = 0, biaya SKS = 0, tapi BPP/SPP tetap masuk). Semester
 * dihitung otomatis lewat resolveSemesterMahasiswa saat KRS belum ada.
 *
 * Mahasiswa yang SUDAH punya tagihan untuk tahun ajaran ini tetap DIHITUNG ULANG (bukan
 * dilewati) — supaya perubahan di KRS (tambah/kurang SKS), Master Tarif Kuliah, atau Daftar
 * Potongan setelah tagihan pertama dibuat ikut ter-update kalau admin menjalankan generate lagi.
 * Hanya baris yang nilainya benar-benar berubah yang ditulis ulang ke DB (dihitung di `updated`,
 * terpisah dari `generated` untuk baris yang baru dibuat). sisaTagihan otomatis ikut menyesuaikan
 * karena dihitung dari totalTagihan - totalDibayar setiap kali dibaca (lihat withSisa), jadi
 * pembayaran yang sudah tercatat tidak perlu diutak-atik. Mahasiswa yang tarif kuliahnya belum
 * terdaftar di Master Tarif Kuliah dilewati (dilaporkan lewat `skipped`).
 */
const generateTagihan = async (tahunAjaranId, actorId) => {
  const tahunAjaran = await TahunAjaran.findByPk(tahunAjaranId);
  if (!tahunAjaran) throw new ApiError(404, 'Tahun ajaran tidak ditemukan');

  const mahasiswaList = await Mahasiswa.findAll({
    where: { isActive: true },
    include: [{ model: TahunAjaran, as: 'tahunAjaran', required: false }],
  });

  const existingList = await TagihanKuliah.findAll({ where: { tahunAjaranId } });
  const existingByMahasiswaId = new Map(existingList.map((t) => [t.mahasiswaId, t]));

  let generated = 0;
  let updated = 0;
  const skipped = [];

  for (const mahasiswa of mahasiswaList) {
    const tarif = await findTarifKuliah(mahasiswa);
    if (!tarif) {
      skipped.push({ mahasiswaId: mahasiswa.id, nim: mahasiswa.nim, alasan: 'Tarif kuliah belum terdaftar' });
      continue;
    }

    const krs = await findKrsTerkunci(mahasiswa.id, tahunAjaranId);
    const sksDiambil = (krs?.detailList ?? []).reduce((sum, d) => sum + (d.kelasKuliah?.sks ?? 0), 0);
    const semester = krs ? krs.semester : resolveSemesterMahasiswa(mahasiswa, tahunAjaran);

    const potonganRows = await DaftarPotongan.findAll({
      where: { mahasiswaId: mahasiswa.id, [Op.or]: [{ semester }, { semester: null }] },
    });
    const potongan = potonganRows.reduce((sum, p) => sum + p.biaya, 0);

    const biayaSksSubtotal = sksDiambil * tarif.biayaSks;
    const biayaLainLain = tarif.biayaBpp + tarif.biayaSpp;
    const totalTagihan = Math.max(biayaSksSubtotal + biayaLainLain - potongan, 0);

    const payload = {
      semester,
      sksDiambil,
      hargaPerSks: tarif.biayaSks,
      biayaSks: biayaSksSubtotal,
      biayaBpp: tarif.biayaBpp,
      biayaSpp: tarif.biayaSpp,
      potongan,
      totalTagihan,
    };

    const existing = existingByMahasiswaId.get(mahasiswa.id);
    if (existing) {
      const isChanged = Object.entries(payload).some(([key, value]) => existing[key] !== value);
      if (isChanged) {
        await existing.update({ ...payload, updatedBy: actorId });
        updated += 1;
      }
      continue;
    }

    await TagihanKuliah.create({
      mahasiswaId: mahasiswa.id,
      tahunAjaranId,
      ...payload,
      createdBy: actorId,
      updatedBy: actorId,
    });
    generated += 1;
  }

  return { generated, updated, skippedCount: skipped.length, skipped };
};

const listTagihan = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const where = {};
  if (query.tahunAjaranId) where.tahunAjaranId = query.tahunAjaranId;

  const mahasiswaWhere = {};
  if (query.search) {
    mahasiswaWhere[Op.or] = [
      { nim: { [Op.like]: `%${query.search}%` } },
      { namaLengkap: { [Op.like]: `%${query.search}%` } },
    ];
  }

  const { rows, count } = await TagihanKuliah.findAndCountAll({
    where,
    include: [
      {
        model: Mahasiswa,
        as: 'mahasiswa',
        required: true,
        where: Object.keys(mahasiswaWhere).length ? mahasiswaWhere : undefined,
        include: [{ model: Jurusan, as: 'jurusan' }, { model: GolonganKelas, as: 'golonganKelas' }],
      },
      { model: TahunAjaran, as: 'tahunAjaran' },
      { model: PembayaranKuliah, as: 'pembayaranList' },
    ],
    limit,
    offset,
    order: [['id', 'DESC']],
    subQuery: false,
    distinct: true,
  });

  return { data: rows.map(withSisa), meta: getPagingMeta(count, page, limit) };
};

const getTagihanById = async (id) => {
  const tagihan = await TagihanKuliah.findByPk(id, {
    include: [...includeRelations, { model: PembayaranKuliah, as: 'pembayaranList' }],
  });
  if (!tagihan) throw new ApiError(404, 'Tagihan kuliah tidak ditemukan');
  return withSisa(tagihan);
};

/** Dipakai halaman Pembayaran Kuliah: cari tagihan aktif mahasiswa berdasarkan NIM atau nama (partial match). */
const findTagihanAktifByNim = async (search, tahunAjaranId) => {
  const mahasiswaList = await Mahasiswa.findAll({
    where: {
      [Op.or]: [{ nim: { [Op.like]: `%${search}%` } }, { namaLengkap: { [Op.like]: `%${search}%` } }],
    },
    limit: 20,
  });
  if (!mahasiswaList.length) throw new ApiError(404, `Mahasiswa dengan NIM/Nama "${search}" tidak ditemukan`);

  const where = { mahasiswaId: { [Op.in]: mahasiswaList.map((m) => m.id) } };
  if (tahunAjaranId) where.tahunAjaranId = tahunAjaranId;

  const tagihanList = await TagihanKuliah.findAll({
    where,
    include: [...includeRelations, { model: PembayaranKuliah, as: 'pembayaranList' }],
    order: [['id', 'DESC']],
  });
  return tagihanList.map(withSisa);
};

module.exports = { generateTagihan, listTagihan, getTagihanById, findTagihanAktifByNim, findTarifKuliah };
