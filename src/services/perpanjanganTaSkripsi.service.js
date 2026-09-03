const { Op } = require('sequelize');
const { PerpanjanganTaSkripsi, Mahasiswa, Jurusan, TarifTaSkripsi } = require('../models');
const ApiError = require('../utils/ApiError');
const { getPagination, getPagingMeta } = require('../utils/pagination');
const { postJurnal, getAkunByKode } = require('./jurnal.service');

const includeMahasiswa = [{ model: Mahasiswa, as: 'mahasiswa', include: [{ model: Jurusan, as: 'jurusan' }] }];

const listPerpanjangan = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const mahasiswaWhere = {};
  if (query.search) {
    mahasiswaWhere[Op.or] = [
      { nim: { [Op.like]: `%${query.search}%` } },
      { namaLengkap: { [Op.like]: `%${query.search}%` } },
    ];
  }

  const { rows, count } = await PerpanjanganTaSkripsi.findAndCountAll({
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

/** Tarif perpanjangan yang berlaku untuk mahasiswa pada satu periode — dipakai untuk auto-isi nominal di form. */
const getTarifPerpanjangan = async (nim, periode) => {
  const mahasiswa = await Mahasiswa.findOne({ where: { nim } });
  if (!mahasiswa) throw new ApiError(404, `Mahasiswa dengan NIM "${nim}" tidak ditemukan`);

  const tarif = await TarifTaSkripsi.findOne({
    where: { jurusanId: mahasiswa.jurusanId, periode, isActive: true },
  });
  return { mahasiswaId: mahasiswa.id, biayaPerpanjangan: tarif ? tarif.biayaPerpanjangan : null };
};

const createPerpanjangan = async (payload, actorId) => {
  const mahasiswa = await Mahasiswa.findByPk(payload.mahasiswaId);
  if (!mahasiswa) throw new ApiError(404, 'Mahasiswa tidak ditemukan');

  const item = await PerpanjanganTaSkripsi.create({ ...payload, createdBy: actorId, updatedBy: actorId });

  const akunKas = await getAkunByKode('1-1001');
  const akunPendapatan = await getAkunByKode('4-1004');
  await postJurnal({
    tanggal: payload.tanggalBayar,
    noBukti: payload.noBukti,
    keterangan: `Perpanjangan TA/Skripsi - ${mahasiswa.nim}`,
    referensiTipe: 'PERPANJANGAN_TA_SKRIPSI',
    referensiId: item.id,
    createdBy: actorId,
    lines: [
      { akunId: akunKas.id, debit: payload.nominal, kredit: 0 },
      { akunId: akunPendapatan.id, debit: 0, kredit: payload.nominal },
    ],
  });

  return PerpanjanganTaSkripsi.findByPk(item.id, { include: includeMahasiswa });
};

const deletePerpanjangan = async (id) => {
  const item = await PerpanjanganTaSkripsi.findByPk(id);
  if (!item) throw new ApiError(404, 'Data perpanjangan tidak ditemukan');
  await item.destroy();
};

module.exports = { listPerpanjangan, getTarifPerpanjangan, createPerpanjangan, deletePerpanjangan };
