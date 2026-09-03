const { Op } = require('sequelize');
const { PembayaranSertifikasi, Mahasiswa } = require('../models');
const ApiError = require('../utils/ApiError');
const { getPagination, getPagingMeta } = require('../utils/pagination');
const { resolveOrder } = require('../utils/sorting');
const { postJurnal, getAkunByKode } = require('./jurnal.service');

const includeRelations = [{ model: Mahasiswa, as: 'mahasiswa', required: false }];

const SORTABLE_COLUMNS = {
  tanggalBayar: ['tanggalBayar'],
  noBukti: ['noBukti'],
  bayar: ['bayar'],
  statusSertifikasi: ['statusSertifikasi'],
};

const listPembayaranSertifikasi = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const where = {};
  if (query.statusSertifikasi) where.statusSertifikasi = query.statusSertifikasi;

  const include = query.search
    ? [
        {
          ...includeRelations[0],
          required: true,
          where: {
            [Op.or]: [
              { nim: { [Op.like]: `%${query.search}%` } },
              { namaLengkap: { [Op.like]: `%${query.search}%` } },
            ],
          },
        },
      ]
    : includeRelations;

  const { rows, count } = await PembayaranSertifikasi.findAndCountAll({
    where,
    include,
    limit,
    offset,
    order: resolveOrder(query, SORTABLE_COLUMNS, [['id', 'DESC']]),
    subQuery: false,
    distinct: true,
  });
  return { data: rows, meta: getPagingMeta(count, page, limit) };
};

const getPembayaranSertifikasiById = async (id) => {
  const item = await PembayaranSertifikasi.findByPk(id, { include: includeRelations });
  if (!item) throw new ApiError(404, 'Data pembayaran sertifikasi tidak ditemukan');
  return item;
};

const resolveMahasiswaId = async (nim) => {
  const mahasiswa = await Mahasiswa.findOne({ where: { nim } });
  if (!mahasiswa) throw new ApiError(404, `Mahasiswa dengan NIM "${nim}" tidak ditemukan`);
  return mahasiswa.id;
};

const createPembayaranSertifikasi = async (payload, actorId) => {
  const { nim, ...rest } = payload;
  const mahasiswaId = await resolveMahasiswaId(nim);
  const item = await PembayaranSertifikasi.create({ ...rest, mahasiswaId, createdBy: actorId, updatedBy: actorId });

  const akunKas = await getAkunByKode('1-1001');
  const akunPendapatan = await getAkunByKode('4-1002');
  await postJurnal({
    tanggal: payload.tanggalBayar,
    noBukti: payload.noBukti,
    keterangan: `Pembayaran sertifikasi - ${nim}`,
    referensiTipe: 'PEMBAYARAN_SERTIFIKASI',
    referensiId: item.id,
    createdBy: actorId,
    lines: [
      { akunId: akunKas.id, debit: payload.bayar, kredit: 0 },
      { akunId: akunPendapatan.id, debit: 0, kredit: payload.bayar },
    ],
  });

  return getPembayaranSertifikasiById(item.id);
};

const updatePembayaranSertifikasi = async (id, payload, actorId) => {
  const item = await getPembayaranSertifikasiById(id);
  const { nim, ...rest } = payload;
  const updates = { ...rest, updatedBy: actorId };
  if (nim) updates.mahasiswaId = await resolveMahasiswaId(nim);
  await item.update(updates);
  return getPembayaranSertifikasiById(id);
};

const deletePembayaranSertifikasi = async (id) => {
  const item = await getPembayaranSertifikasiById(id);
  await item.destroy();
};

module.exports = {
  listPembayaranSertifikasi,
  getPembayaranSertifikasiById,
  createPembayaranSertifikasi,
  updatePembayaranSertifikasi,
  deletePembayaranSertifikasi,
};
