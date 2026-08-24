const { Op } = require('sequelize');
const { Kurikulum, KonversiKurikulum } = require('../models');
const ApiError = require('../utils/ApiError');

/**
 * "Kurikulum" sebagai satu paket/versi = kombinasi (jurusanId, tahunAjaranId) pada tabel
 * Kurikulum. Dropdown Dari/Ke Kurikulum di FE menawarkan tiap kombinasi unik yang ada;
 * label (nama jurusan/tahun ajaran) diresolve di FE dari data yang sudah dimuat, supaya
 * query di sini tetap sederhana (hindari GROUP BY yang digabung dengan kolom hasil JOIN).
 */
const getFilterOptions = async () => {
  const rows = await Kurikulum.findAll({
    attributes: ['jurusanId', 'tahunAjaranId'],
    where: { jurusanId: { [Op.ne]: null }, tahunAjaranId: { [Op.ne]: null } },
    group: ['jurusan_id', 'tahun_ajaran_id'],
    raw: true,
  });
  return rows.map((r) => ({ jurusanId: r.jurusanId, tahunAjaranId: r.tahunAjaranId }));
};

const listKonversi = async (query) => {
  const { dariJurusanId, dariTahunAjaranId, keJurusanId, keTahunAjaranId } = query;
  if (!dariJurusanId || !dariTahunAjaranId) throw new ApiError(400, 'Dari Kurikulum wajib dipilih');

  const dariRows = await Kurikulum.findAll({
    where: { jurusanId: dariJurusanId, tahunAjaranId: dariTahunAjaranId },
    order: [
      ['semester', 'ASC'],
      ['mataKuliah', 'ASC'],
    ],
  });

  const keOptions =
    keJurusanId && keTahunAjaranId
      ? await Kurikulum.findAll({
          where: { jurusanId: keJurusanId, tahunAjaranId: keTahunAjaranId },
          order: [['mataKuliah', 'ASC']],
        })
      : [];

  const dariIds = dariRows.map((r) => r.id);
  const existing = dariIds.length
    ? await KonversiKurikulum.findAll({
        where: { dariKurikulumId: { [Op.in]: dariIds } },
        include: [{ model: Kurikulum, as: 'keKurikulum', required: false }],
      })
    : [];
  const existingByDariId = new Map(existing.map((e) => [e.dariKurikulumId, e]));

  const rows = dariRows.map((dari) => {
    const mapping = existingByDariId.get(dari.id);
    return {
      dariKurikulum: dari,
      keKurikulumId: mapping?.keKurikulumId ?? null,
      keKurikulum: mapping?.keKurikulum ?? null,
    };
  });

  return { rows, keOptions };
};

const saveKonversi = async (payload, actorId) => {
  const { dariKurikulumId, keKurikulumId } = payload;
  const dari = await Kurikulum.findByPk(dariKurikulumId);
  if (!dari) throw new ApiError(404, 'Mata kuliah (Dari Kurikulum) tidak ditemukan');

  const [item] = await KonversiKurikulum.findOrCreate({
    where: { dariKurikulumId },
    defaults: { dariKurikulumId, keKurikulumId, createdBy: actorId, updatedBy: actorId },
  });
  await item.update({ keKurikulumId, updatedBy: actorId });
  return item;
};

module.exports = { getFilterOptions, listKonversi, saveKonversi };
