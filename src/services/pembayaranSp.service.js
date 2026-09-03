const { Op } = require('sequelize');
const { PembayaranSp, Mahasiswa, Jurusan, TarifLain } = require('../models');
const ApiError = require('../utils/ApiError');
const { getPagination, getPagingMeta } = require('../utils/pagination');
const { postJurnal, getAkunByKode } = require('./jurnal.service');

const KODE_BIAYA_SP = 'SP';

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

  const { rows, count } = await PembayaranSp.findAndCountAll({
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

/**
 * Tarif SP (Surat Peringatan) yang berlaku untuk mahasiswa — diambil dari Master Tarif Biaya Lain
 * dengan kode biaya "SP", dicocokkan ke tahun masuk (angkatan) mahasiswa, sama seperti pola
 * biaya lain lainnya (lihat pembayaranLain.service.js). Dipakai untuk auto-isi nominal di form.
 */
const getTarifSp = async (nim) => {
  const mahasiswa = await Mahasiswa.findOne({ where: { nim } });
  if (!mahasiswa) throw new ApiError(404, `Mahasiswa dengan NIM "${nim}" tidak ditemukan`);

  const tarif = await TarifLain.findOne({
    where: { kodeBiaya: KODE_BIAYA_SP, tahunMasuk: mahasiswa.tahunMasuk, isActive: true },
  });
  return { mahasiswaId: mahasiswa.id, biayaSp: tarif ? tarif.biaya : null };
};

const createPembayaran = async (payload, actorId) => {
  const mahasiswa = await Mahasiswa.findByPk(payload.mahasiswaId);
  if (!mahasiswa) throw new ApiError(404, 'Mahasiswa tidak ditemukan');

  const item = await PembayaranSp.create({ ...payload, createdBy: actorId, updatedBy: actorId });

  const akunKas = await getAkunByKode('1-1001');
  const akunPendapatan = await getAkunByKode('4-1005');
  await postJurnal({
    tanggal: payload.tanggalBayar,
    noBukti: payload.noBukti,
    keterangan: `Pembayaran SP - ${mahasiswa.nim}`,
    referensiTipe: 'PEMBAYARAN_SP',
    referensiId: item.id,
    createdBy: actorId,
    lines: [
      { akunId: akunKas.id, debit: payload.nominal, kredit: 0 },
      { akunId: akunPendapatan.id, debit: 0, kredit: payload.nominal },
    ],
  });

  return PembayaranSp.findByPk(item.id, { include: includeMahasiswa });
};

const deletePembayaran = async (id) => {
  const item = await PembayaranSp.findByPk(id);
  if (!item) throw new ApiError(404, 'Data pembayaran tidak ditemukan');
  await item.destroy();
};

module.exports = { listPembayaran, getTarifSp, createPembayaran, deletePembayaran };
