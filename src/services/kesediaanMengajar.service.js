const { KesediaanMengajar, MataKuliah, Kurikulum, TahunAjaran } = require('../models');
const ApiError = require('../utils/ApiError');
const { formatTahunAjaran } = require('../utils/tahunAjaran');

/**
 * Kesediaan mengajar dosen (portal Dosen → Lain-Lain → Kesediaan Mengajar). Satu baris = satu
 * matakuliah yang bersedia diajar + jam kesediaan per hari, untuk tahun akademik yang dipilih di
 * Setting Tahun Akademik (default: tahun ajaran aktif). Bahan ploting jadwal periode berikutnya.
 */
const { HARI } = KesediaanMengajar;

const resolveTahunAjaran = async (tahunAjaranId) => {
  const ta = tahunAjaranId ? await TahunAjaran.findByPk(tahunAjaranId) : await TahunAjaran.findOne({ where: { isActive: true } });
  if (!ta) throw new ApiError(400, 'Belum ada tahun ajaran aktif');
  return ta;
};

const toRow = (item) => ({
  id: item.id,
  mataKuliahId: item.mataKuliahId,
  kodeMk: item.mataKuliah?.kodeMk ?? null,
  namaMk: item.mataKuliah?.namaMk ?? null,
  sks: item.mataKuliah?.sks ?? null,
  ...Object.fromEntries(HARI.map((h) => [h, item[h]])),
});

/** Data halaman: periode, pilihan matakuliah & kesediaan dosen pada periode tersebut. */
const getKesediaan = async (dosenId, tahunAjaranId) => {
  const tahunAjaran = await resolveTahunAjaran(tahunAjaranId);
  const [rows, mataKuliah] = await Promise.all([
    KesediaanMengajar.findAll({
      where: { dosenId, tahunAjaranId: tahunAjaran.id },
      include: [{ model: MataKuliah.unscoped(), as: 'mataKuliah', attributes: MataKuliah.ATTRS_RINGKAS, required: false }],
      order: [['id', 'ASC']],
    }),
    MataKuliah.findAll({
      attributes: MataKuliah.ATTRS_RINGKAS,
      include: [{ model: Kurikulum, as: 'kurikulum', attributes: ['id', 'nama'], required: true }],
      order: [['mataKuliah', 'ASC'], ['kode', 'ASC']],
    }),
  ]);
  return {
    tahunAjaran: { id: tahunAjaran.id, label: formatTahunAjaran(tahunAjaran) },
    mataKuliahOptions: mataKuliah.map((m) => ({ value: m.id, label: `${m.kode} - ${m.mataKuliah} (${m.sksTotal} SKS) · ${m.kurikulum.nama}` })),
    items: rows.map(toRow),
  };
};

const pickHari = (payload) => Object.fromEntries(HARI.map((h) => [h, payload[h] || null]));

const assertPayload = async (payload) => {
  if (!HARI.some((h) => payload[h])) throw new ApiError(400, 'Isi jam kesediaan minimal untuk satu hari');
  HARI.forEach((h) => {
    const v = payload[h];
    if (v && v.slice(0, 5) >= v.slice(6)) throw new ApiError(400, `Jam selesai hari ${h} harus setelah jam mulai`);
  });
  if (!(await MataKuliah.findByPk(payload.mataKuliahId))) throw new ApiError(400, 'Matakuliah tidak ditemukan');
};

const findOne = (id) =>
  KesediaanMengajar.findByPk(id, {
    include: [{ model: MataKuliah.unscoped(), as: 'mataKuliah', attributes: MataKuliah.ATTRS_RINGKAS, required: false }],
  });

const createKesediaan = async (dosenId, tahunAjaranId, payload) => {
  const tahunAjaran = await resolveTahunAjaran(tahunAjaranId);
  await assertPayload(payload);
  const exists = await KesediaanMengajar.count({ where: { dosenId, tahunAjaranId: tahunAjaran.id, mataKuliahId: payload.mataKuliahId } });
  if (exists) throw new ApiError(400, 'Matakuliah ini sudah ada di daftar kesediaan; ubah baris yang ada');
  const item = await KesediaanMengajar.create({
    dosenId,
    tahunAjaranId: tahunAjaran.id,
    mataKuliahId: payload.mataKuliahId,
    ...pickHari(payload),
  });
  return toRow(await findOne(item.id));
};

const findMilikDosen = async (dosenId, id) => {
  const item = await KesediaanMengajar.findOne({ where: { id, dosenId } });
  if (!item) throw new ApiError(404, 'Data kesediaan mengajar tidak ditemukan');
  return item;
};

const updateKesediaan = async (dosenId, id, payload) => {
  const item = await findMilikDosen(dosenId, id);
  await assertPayload(payload);
  if (payload.mataKuliahId !== item.mataKuliahId) {
    const exists = await KesediaanMengajar.count({
      where: { dosenId, tahunAjaranId: item.tahunAjaranId, mataKuliahId: payload.mataKuliahId },
    });
    if (exists) throw new ApiError(400, 'Matakuliah ini sudah ada di daftar kesediaan');
  }
  await item.update({ mataKuliahId: payload.mataKuliahId, ...pickHari(payload) });
  return toRow(await findOne(item.id));
};

const deleteKesediaan = async (dosenId, id) => {
  const item = await findMilikDosen(dosenId, id);
  await item.destroy();
};

module.exports = { getKesediaan, createKesediaan, updateKesediaan, deleteKesediaan };
