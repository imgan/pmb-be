const { Op } = require('sequelize');
const { PembayaranLain, TarifLain, Mahasiswa, Jurusan } = require('../models');
const ApiError = require('../utils/ApiError');
const { getPagination, getPagingMeta } = require('../utils/pagination');
const { postJurnal, getAkunByKode } = require('./jurnal.service');

const includeMahasiswa = [
  { model: Mahasiswa, as: 'mahasiswa', include: [{ model: Jurusan, as: 'jurusan' }] },
  { model: TarifLain, as: 'tarifLain' },
];

const listPembayaran = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const mahasiswaWhere = {};
  if (query.search) {
    mahasiswaWhere[Op.or] = [
      { nim: { [Op.like]: `%${query.search}%` } },
      { namaLengkap: { [Op.like]: `%${query.search}%` } },
    ];
  }

  const { rows, count } = await PembayaranLain.findAndCountAll({
    include: [
      {
        model: Mahasiswa,
        as: 'mahasiswa',
        required: true,
        where: Object.keys(mahasiswaWhere).length ? mahasiswaWhere : undefined,
        include: [{ model: Jurusan, as: 'jurusan' }],
      },
      { model: TarifLain, as: 'tarifLain' },
    ],
    limit,
    offset,
    order: [['tanggalBayar', 'DESC'], ['id', 'DESC']],
    subQuery: false,
    distinct: true,
  });

  return { data: rows, meta: getPagingMeta(count, page, limit) };
};

/**
 * Rincian tarif biaya lain (master TarifLain) yang berlaku untuk satu mahasiswa — dicocokkan
 * dari TarifLain.tahunMasuk yang sama dengan Mahasiswa.tahunMasuk (tarif ditentukan per angkatan,
 * bukan per tahun ajaran berjalan seperti tagihan kuliah) — dibandingkan dengan yang sudah
 * dibayar. Dipakai untuk melengkapi dropdown "tagihan lain" di halaman Pembayaran Kuliah supaya
 * kasir bisa langsung mencatat pembayaran biaya lain (mis. SAP, jas almamater) tanpa pindah menu.
 */
const getRingkasanBiayaLainByMahasiswaId = async (mahasiswaId) => {
  const mahasiswa = await Mahasiswa.findByPk(mahasiswaId);
  if (!mahasiswa) return [];

  const tarifList = await TarifLain.findAll({
    where: { tahunMasuk: mahasiswa.tahunMasuk, isActive: true },
    order: [['kodeBiaya', 'ASC']],
  });
  if (!tarifList.length) return [];

  const pembayaranList = await PembayaranLain.findAll({
    where: { mahasiswaId, tarifLainId: tarifList.map((t) => t.id) },
  });
  const dibayarByTarifId = new Map();
  pembayaranList.forEach((p) => {
    dibayarByTarifId.set(p.tarifLainId, (dibayarByTarifId.get(p.tarifLainId) ?? 0) + p.nominal);
  });

  return tarifList.map((tarif) => {
    const dibayar = dibayarByTarifId.get(tarif.id) ?? 0;
    return {
      tarifLainId: tarif.id,
      kodeBiaya: tarif.kodeBiaya,
      keterangan: tarif.keterangan,
      tarif: tarif.biaya,
      dibayar,
      sisa: Math.max(tarif.biaya - dibayar, 0),
    };
  });
};

const getRingkasanBiayaLainByNim = async (nim) => {
  const mahasiswa = await Mahasiswa.findOne({ where: { nim } });
  if (!mahasiswa) return [];
  const ringkasan = await getRingkasanBiayaLainByMahasiswaId(mahasiswa.id);
  return ringkasan.map((r) => ({ ...r, mahasiswaId: mahasiswa.id }));
};

const createPembayaran = async (payload, actorId) => {
  const mahasiswa = await Mahasiswa.findByPk(payload.mahasiswaId);
  if (!mahasiswa) throw new ApiError(404, 'Mahasiswa tidak ditemukan');
  const tarif = await TarifLain.findByPk(payload.tarifLainId);
  if (!tarif) throw new ApiError(404, 'Tarif biaya lain tidak ditemukan');

  const item = await PembayaranLain.create({ ...payload, createdBy: actorId, updatedBy: actorId });

  const akunKas = await getAkunByKode('1-1001');
  const akunPendapatan = await getAkunByKode('4-1005');
  await postJurnal({
    tanggal: payload.tanggalBayar,
    noBukti: payload.noBukti,
    keterangan: `Pembayaran Biaya Lain (${tarif.kodeBiaya}) - ${mahasiswa.nim}`,
    referensiTipe: 'PEMBAYARAN_LAIN',
    referensiId: item.id,
    createdBy: actorId,
    lines: [
      { akunId: akunKas.id, debit: payload.nominal, kredit: 0 },
      { akunId: akunPendapatan.id, debit: 0, kredit: payload.nominal },
    ],
  });

  return PembayaranLain.findByPk(item.id, { include: includeMahasiswa });
};

const deletePembayaran = async (id) => {
  const item = await PembayaranLain.findByPk(id);
  if (!item) throw new ApiError(404, 'Data pembayaran tidak ditemukan');
  await item.destroy();
};

/**
 * Peta mahasiswaId -> total sisa tagihan biaya lain (seluruh kode biaya aktif yang berlaku untuk
 * angkatan mahasiswa tsb), dihitung sekali untuk semua mahasiswa yang punya tarif biaya lain
 * berlaku — dipakai laporan Tunggakan Mahasiswa supaya tidak query per-mahasiswa satu-satu.
 */
const buildSisaBiayaLainMap = async () => {
  const tarifList = await TarifLain.findAll({ where: { isActive: true }, raw: true });
  if (!tarifList.length) return new Map();

  const tarifByTahunMasuk = new Map();
  tarifList.forEach((t) => {
    if (!tarifByTahunMasuk.has(t.tahunMasuk)) tarifByTahunMasuk.set(t.tahunMasuk, []);
    tarifByTahunMasuk.get(t.tahunMasuk).push(t);
  });

  const mahasiswaList = await Mahasiswa.findAll({
    where: { tahunMasuk: [...tarifByTahunMasuk.keys()] },
    attributes: ['id', 'tahunMasuk'],
    raw: true,
  });
  if (!mahasiswaList.length) return new Map();

  const pembayaranList = await PembayaranLain.findAll({
    where: { mahasiswaId: mahasiswaList.map((m) => m.id) },
    attributes: ['mahasiswaId', 'tarifLainId', 'nominal'],
    raw: true,
  });
  const dibayarByKey = new Map();
  pembayaranList.forEach((p) => {
    const key = `${p.mahasiswaId}|${p.tarifLainId}`;
    dibayarByKey.set(key, (dibayarByKey.get(key) ?? 0) + Number(p.nominal));
  });

  const result = new Map();
  mahasiswaList.forEach((mahasiswa) => {
    const tarifAngkatan = tarifByTahunMasuk.get(mahasiswa.tahunMasuk) ?? [];
    if (!tarifAngkatan.length) return;
    const sisa = tarifAngkatan.reduce((sum, tarif) => {
      const dibayar = dibayarByKey.get(`${mahasiswa.id}|${tarif.id}`) ?? 0;
      return sum + Math.max(Number(tarif.biaya) - dibayar, 0);
    }, 0);
    if (sisa > 0) result.set(mahasiswa.id, sisa);
  });
  return result;
};

module.exports = {
  listPembayaran,
  getRingkasanBiayaLainByMahasiswaId,
  getRingkasanBiayaLainByNim,
  createPembayaran,
  deletePembayaran,
  buildSisaBiayaLainMap,
};
