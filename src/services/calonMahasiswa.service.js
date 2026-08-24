const { Op } = require('sequelize');
const { CalonMahasiswa, Gelombang, Peserta } = require('../models');
const ApiError = require('../utils/ApiError');
const { getPagination, getPagingMeta } = require('../utils/pagination');
const { resolveOrder } = require('../utils/sorting');

const includeRelations = [
  { model: Gelombang, as: 'gelombang' },
  { model: Peserta, as: 'peserta', attributes: ['id', 'namaLengkap', 'email', 'statusUjian', 'statusKelulusan'] },
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

  const { rows, count } = await CalonMahasiswa.findAndCountAll({
    where,
    include: includeRelations,
    limit,
    offset,
    order: resolveOrder(query, SORTABLE_COLUMNS),
    subQuery: false,
    distinct: true,
  });
  return { data: rows.map(withDerivedStatus), meta: getPagingMeta(count, page, limit) };
};

const getCalonMahasiswaByIdRaw = async (id) => {
  const calonMahasiswa = await CalonMahasiswa.findByPk(id, { include: includeRelations });
  if (!calonMahasiswa) throw new ApiError(404, 'Calon mahasiswa not found');
  return calonMahasiswa;
};

const getCalonMahasiswaById = async (id) => withDerivedStatus(await getCalonMahasiswaByIdRaw(id));

const createCalonMahasiswa = async (payload, actorId) => {
  const finalPayload = await syncDerivedStatusOnWrite(payload);
  const calonMahasiswa = await CalonMahasiswa.create({ ...finalPayload, createdBy: actorId, updatedBy: actorId });
  return getCalonMahasiswaById(calonMahasiswa.id);
};

const updateCalonMahasiswa = async (id, payload, actorId) => {
  const calonMahasiswa = await getCalonMahasiswaByIdRaw(id);
  const finalPayload = await syncDerivedStatusOnWrite({ pesertaId: calonMahasiswa.pesertaId, ...payload });
  await calonMahasiswa.update({ ...finalPayload, updatedBy: actorId });
  return getCalonMahasiswaById(id);
};

const deleteCalonMahasiswa = async (id) => {
  const calonMahasiswa = await getCalonMahasiswaByIdRaw(id);
  await calonMahasiswa.destroy();
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
  getStats,
  listPublicCalonMahasiswa,
  getPublicStats,
};
