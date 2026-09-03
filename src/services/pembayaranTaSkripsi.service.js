const { Op } = require('sequelize');
const { PembayaranTaSkripsi, PerpanjanganTaSkripsi, Mahasiswa, Jurusan, TarifTaSkripsi } = require('../models');
const ApiError = require('../utils/ApiError');
const { getPagination, getPagingMeta } = require('../utils/pagination');
const { postJurnal, getAkunByKode } = require('./jurnal.service');

const includeMahasiswa = [{ model: Mahasiswa, as: 'mahasiswa', include: [{ model: Jurusan, as: 'jurusan' }] }];

const listPembayaran = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const mahasiswaWhere = {};
  if (query.search) {
    mahasiswaWhere[Op.or] = [
      { nim: { [Op.like]: `%${query.search}%` } },
      { namaLengkap: { [Op.like]: `%${query.search}%` } },
    ];
  }

  const { rows, count } = await PembayaranTaSkripsi.findAndCountAll({
    include: [
      {
        model: Mahasiswa,
        as: 'mahasiswa',
        required: true,
        where: Object.keys(mahasiswaWhere).length ? mahasiswaWhere : undefined,
        include: [{ model: Jurusan, as: 'jurusan' }],
      },
    ],
    limit,
    offset,
    order: [['tanggalBayar', 'DESC'], ['id', 'DESC']],
    subQuery: false,
    distinct: true,
  });

  return { data: rows, meta: getPagingMeta(count, page, limit) };
};

/** Tarif pendaftaran TA/Skripsi yang berlaku untuk mahasiswa (berdasarkan jurusan) pada satu periode — dipakai untuk auto-isi nominal di form. */
const getTarifPendaftaran = async (nim, periode) => {
  const mahasiswa = await Mahasiswa.findOne({ where: { nim } });
  if (!mahasiswa) throw new ApiError(404, `Mahasiswa dengan NIM "${nim}" tidak ditemukan`);

  const tarif = await TarifTaSkripsi.findOne({
    where: { jurusanId: mahasiswa.jurusanId, periode, isActive: true },
  });
  return { mahasiswaId: mahasiswa.id, biayaPendaftaran: tarif ? tarif.biayaPendaftaran : null };
};

const createPembayaran = async (payload, actorId) => {
  const mahasiswa = await Mahasiswa.findByPk(payload.mahasiswaId);
  if (!mahasiswa) throw new ApiError(404, 'Mahasiswa tidak ditemukan');

  const item = await PembayaranTaSkripsi.create({ ...payload, createdBy: actorId, updatedBy: actorId });

  const akunKas = await getAkunByKode('1-1001');
  const akunPendapatan = await getAkunByKode('4-1004');
  await postJurnal({
    tanggal: payload.tanggalBayar,
    noBukti: payload.noBukti,
    keterangan: `Pembayaran TA/Skripsi - ${mahasiswa.nim}`,
    referensiTipe: 'PEMBAYARAN_TA_SKRIPSI',
    referensiId: item.id,
    createdBy: actorId,
    lines: [
      { akunId: akunKas.id, debit: payload.nominal, kredit: 0 },
      { akunId: akunPendapatan.id, debit: 0, kredit: payload.nominal },
    ],
  });

  return PembayaranTaSkripsi.findByPk(item.id, { include: includeMahasiswa });
};

const deletePembayaran = async (id) => {
  const item = await PembayaranTaSkripsi.findByPk(id);
  if (!item) throw new ApiError(404, 'Data pembayaran tidak ditemukan');
  await item.destroy();
};

/**
 * Rincian tagihan TA/Skripsi per periode untuk satu mahasiswa: tarif pendaftaran & (kalau
 * pernah perpanjangan) tarif perpanjangan, dibandingkan dengan total yang sudah dibayar —
 * dipakai laporan Tunggakan Mahasiswa supaya pembayaran TA/Skripsi ikut masuk sebagai tagihan,
 * bukan cuma tercatat sebagai transaksi lepas. Periode yang dipakai adalah gabungan semua
 * periode yang punya baris pembayaran_ta_skripsi ATAU perpanjangan_ta_skripsi — mahasiswa yang
 * belum pernah bertransaksi TA/Skripsi tidak dianggap menunggak.
 */
const getRingkasanTaSkripsiByMahasiswaId = async (mahasiswaId) => {
  const mahasiswa = await Mahasiswa.findByPk(mahasiswaId);
  if (!mahasiswa) return [];

  const [pembayaranList, perpanjanganList] = await Promise.all([
    PembayaranTaSkripsi.findAll({ where: { mahasiswaId }, order: [['tanggalBayar', 'ASC']] }),
    PerpanjanganTaSkripsi.findAll({ where: { mahasiswaId }, order: [['tanggalBayar', 'ASC']] }),
  ]);
  if (!pembayaranList.length && !perpanjanganList.length) return [];

  const periodeSet = new Set([...pembayaranList.map((p) => p.periode), ...perpanjanganList.map((p) => p.periode)]);
  const tarifList = await TarifTaSkripsi.findAll({
    where: { jurusanId: mahasiswa.jurusanId, periode: [...periodeSet] },
  });
  const tarifByPeriode = new Map(tarifList.map((t) => [t.periode, t]));

  return [...periodeSet]
    .sort((a, b) => a - b)
    .map((periode) => {
      const tarif = tarifByPeriode.get(periode);
      const pembayaranPeriode = pembayaranList.filter((p) => p.periode === periode);
      const perpanjanganPeriode = perpanjanganList.filter((p) => p.periode === periode);

      const pendaftaranTarif = tarif ? tarif.biayaPendaftaran : 0;
      const pendaftaranDibayar = pembayaranPeriode.reduce((sum, p) => sum + p.nominal, 0);

      const perpanjanganTarif = tarif ? tarif.biayaPerpanjangan : 0;
      const perpanjanganDibayar = perpanjanganPeriode.reduce((sum, p) => sum + p.nominal, 0);

      return {
        periode,
        mahasiswaId: mahasiswa.id,
        pendaftaran: {
          tarif: pendaftaranTarif,
          dibayar: pendaftaranDibayar,
          sisa: Math.max(pendaftaranTarif - pendaftaranDibayar, 0),
        },
        perpanjangan: perpanjanganPeriode.length
          ? {
              tarif: perpanjanganTarif,
              dibayar: perpanjanganDibayar,
              sisa: Math.max(perpanjanganTarif - perpanjanganDibayar, 0),
            }
          : null,
        pembayaranList: pembayaranPeriode,
        perpanjanganList: perpanjanganPeriode,
      };
    });
};

const getRingkasanTaSkripsiByNim = async (nim) => {
  const mahasiswa = await Mahasiswa.findOne({ where: { nim } });
  if (!mahasiswa) return [];
  return getRingkasanTaSkripsiByMahasiswaId(mahasiswa.id);
};

/**
 * Peta mahasiswaId -> total sisa tagihan TA/Skripsi (pendaftaran + perpanjangan, seluruh
 * periode), dihitung sekali untuk semua mahasiswa yang punya transaksi TA/Skripsi — dipakai
 * laporan Tunggakan Mahasiswa supaya tidak query per-mahasiswa satu-satu.
 */
const buildSisaTaSkripsiMap = async () => {
  const [pembayaranList, perpanjanganList] = await Promise.all([
    PembayaranTaSkripsi.findAll({ attributes: ['mahasiswaId', 'periode', 'nominal'], raw: true }),
    PerpanjanganTaSkripsi.findAll({ attributes: ['mahasiswaId', 'periode', 'nominal'], raw: true }),
  ]);
  if (!pembayaranList.length && !perpanjanganList.length) return new Map();

  const mahasiswaIds = [...new Set([...pembayaranList.map((p) => p.mahasiswaId), ...perpanjanganList.map((p) => p.mahasiswaId)])];
  const mahasiswaList = await Mahasiswa.findAll({ where: { id: mahasiswaIds }, attributes: ['id', 'jurusanId'], raw: true });
  const jurusanByMahasiswa = new Map(mahasiswaList.map((m) => [m.id, m.jurusanId]));

  const tarifList = await TarifTaSkripsi.findAll({ raw: true });
  const tarifKey = (jurusanId, periode) => `${jurusanId}|${periode}`;
  const tarifByKey = new Map(tarifList.map((t) => [tarifKey(t.jurusanId, t.periode), t]));

  const sumByKey = (list) => {
    const map = new Map();
    list.forEach((row) => {
      const key = `${row.mahasiswaId}|${row.periode}`;
      map.set(key, (map.get(key) ?? 0) + Number(row.nominal));
    });
    return map;
  };
  const dibayarPendaftaran = sumByKey(pembayaranList);
  const dibayarPerpanjangan = sumByKey(perpanjanganList);

  const periodeByMahasiswa = new Map();
  const addPeriode = (mahasiswaId, periode) => {
    if (!periodeByMahasiswa.has(mahasiswaId)) periodeByMahasiswa.set(mahasiswaId, new Set());
    periodeByMahasiswa.get(mahasiswaId).add(periode);
  };
  pembayaranList.forEach((p) => addPeriode(p.mahasiswaId, p.periode));
  perpanjanganList.forEach((p) => addPeriode(p.mahasiswaId, p.periode));

  const result = new Map();
  periodeByMahasiswa.forEach((periodeSet, mahasiswaId) => {
    const jurusanId = jurusanByMahasiswa.get(mahasiswaId);
    let sisa = 0;
    periodeSet.forEach((periode) => {
      const tarif = tarifByKey.get(tarifKey(jurusanId, periode));
      const pendaftaranTarif = tarif ? Number(tarif.biayaPendaftaran) : 0;
      const perpanjanganTarif = tarif ? Number(tarif.biayaPerpanjangan) : 0;
      const key = `${mahasiswaId}|${periode}`;
      sisa += Math.max(pendaftaranTarif - (dibayarPendaftaran.get(key) ?? 0), 0);
      if (dibayarPerpanjangan.has(key)) {
        sisa += Math.max(perpanjanganTarif - (dibayarPerpanjangan.get(key) ?? 0), 0);
      }
    });
    result.set(mahasiswaId, sisa);
  });
  return result;
};

module.exports = {
  listPembayaran,
  getTarifPendaftaran,
  createPembayaran,
  deletePembayaran,
  getRingkasanTaSkripsiByMahasiswaId,
  getRingkasanTaSkripsiByNim,
  buildSisaTaSkripsiMap,
};
