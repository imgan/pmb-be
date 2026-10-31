const { Op } = require('sequelize');
const { Kurikulum, MataKuliah, KonversiKurikulum, Jurusan } = require('../models');
const ApiError = require('../utils/ApiError');

/**
 * Konversi kurikulum: memetakan tiap mata kuliah kurikulum lama (dari) ke padanannya di kurikulum
 * baru (ke). Dropdown Dari/Ke Kurikulum di FE = daftar kurikulum (header).
 */
const getFilterOptions = async () => {
  const rows = await Kurikulum.findAll({
    include: [{ model: Jurusan, as: 'jurusan', attributes: ['id', 'namaJurusan'], required: false }],
    order: [['tahunKurikulum', 'DESC'], ['nama', 'ASC']],
  });
  return rows.map((k) => ({
    value: k.id,
    label: k.nama,
    jurusanId: k.jurusanId,
    prodi: k.jurusan?.namaJurusan ?? null,
    tahunKurikulum: k.tahunKurikulum,
  }));
};

const listKonversi = async (query) => {
  const { dariKurikulumId, keKurikulumId } = query;
  if (!dariKurikulumId) throw new ApiError(400, 'Dari Kurikulum wajib dipilih');

  const dariRows = await MataKuliah.findAll({
    where: { kurikulumId: dariKurikulumId },
    order: [['semester', 'ASC'], ['mataKuliah', 'ASC']],
  });
  const keOptions = keKurikulumId ? await MataKuliah.findAll({ where: { kurikulumId: keKurikulumId }, order: [['mataKuliah', 'ASC']] }) : [];

  const dariIds = dariRows.map((r) => r.id);
  const existing = dariIds.length
    ? await KonversiKurikulum.findAll({
        where: { dariMataKuliahId: { [Op.in]: dariIds } },
        include: [{ model: MataKuliah, as: 'keMataKuliah', required: false }],
      })
    : [];
  const existingByDariId = new Map(existing.map((e) => [e.dariMataKuliahId, e]));

  const rows = dariRows.map((dari) => {
    const mapping = existingByDariId.get(dari.id);
    return {
      dariMataKuliah: dari,
      keMataKuliahId: mapping?.keMataKuliahId ?? null,
      keMataKuliah: mapping?.keMataKuliah ?? null,
    };
  });
  return { rows, keOptions };
};

const saveKonversi = async (payload, actorId) => {
  const { dariMataKuliahId, keMataKuliahId } = payload;
  const dari = await MataKuliah.findByPk(dariMataKuliahId);
  if (!dari) throw new ApiError(404, 'Mata kuliah asal tidak ditemukan');

  // "Batal" di FE mengirim keMataKuliahId null -> pemetaan dihapus, mata kuliah kembali tanpa konversi.
  if (!keMataKuliahId) {
    await KonversiKurikulum.destroy({ where: { dariMataKuliahId } });
    return null;
  }
  if (Number(keMataKuliahId) === Number(dariMataKuliahId)) {
    throw new ApiError(400, 'Mata kuliah tujuan tidak boleh sama dengan mata kuliah asal');
  }
  const ke = await MataKuliah.findByPk(keMataKuliahId);
  if (!ke) throw new ApiError(404, 'Mata kuliah tujuan tidak ditemukan');
  if (ke.kurikulumId === dari.kurikulumId) throw new ApiError(400, 'Mata kuliah tujuan harus dari kurikulum lain');

  const [item] = await KonversiKurikulum.findOrCreate({
    where: { dariMataKuliahId },
    defaults: { dariMataKuliahId, keMataKuliahId, createdBy: actorId, updatedBy: actorId },
  });
  await item.update({ keMataKuliahId, updatedBy: actorId });
  return item;
};

module.exports = { getFilterOptions, listKonversi, saveKonversi };
