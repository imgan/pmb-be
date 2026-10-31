const { fn, col, UniqueConstraintError } = require('sequelize');
const { sequelize, AngketDosenPertanyaan, AngketDosenJawaban, TahunAjaran, Jurusan } = require('../models');
const ApiError = require('../utils/ApiError');
const { formatTahunAjaran } = require('../utils/tahunAjaran');

/**
 * Master pertanyaan angket dosen (penilaian dosen oleh mahasiswa) per Periode Akademik & Tk.
 * Pendidikan (jenjang_pendidikan prodi), dikelompokkan per kategori. "Salin" menyalin daftar
 * pertanyaan dari periode/jenjang lain. Pilihan jawaban (skala nilai) satu untuk semua.
 */

const toJson = (p) => ({
  id: p.id,
  tahunAjaranId: p.tahunAjaranId,
  jenjangPendidikan: p.jenjangPendidikan,
  kategori: p.kategori,
  pertanyaan: p.pertanyaan,
  openQuestion: p.openQuestion,
  urutan: p.urutan,
});

/** Pertanyaan satu periode & jenjang (dipakai juga portal mahasiswa). */
const listUntuk = (tahunAjaranId, jenjangPendidikan) =>
  AngketDosenPertanyaan.findAll({ where: { tahunAjaranId, jenjangPendidikan }, order: [['urutan', 'ASC'], ['id', 'ASC']] });

/** Tingkat pendidikan dari master prodi (jurusan.jenjang_pendidikan). */
const listJenjang = async () =>
  (await Jurusan.findAll({ attributes: [[fn('DISTINCT', col('jenjang_pendidikan')), 'jenjang']], raw: true }))
    .map((r) => r.jenjang)
    .filter(Boolean)
    .sort();

/** Periode & jenjang yang sudah punya pertanyaan (sumber "Salin Data"). */
const listPeriodeTerisi = async () => {
  const rows = await AngketDosenPertanyaan.findAll({
    attributes: ['tahunAjaranId', 'jenjangPendidikan', [fn('COUNT', col('AngketDosenPertanyaan.id')), 'jumlah']],
    include: [{ model: TahunAjaran, as: 'tahunAjaran', attributes: ['id', 'nama', 'jenisSemester', 'tahunMulai'] }],
    group: ['tahunAjaranId', 'jenjangPendidikan', 'tahunAjaran.id'],
  });
  return rows
    .map((r) => ({
      tahunAjaranId: r.tahunAjaranId,
      tahunAjaran: formatTahunAjaran(r.tahunAjaran),
      tahunMulai: r.tahunAjaran?.tahunMulai ?? 0,
      jenjangPendidikan: r.jenjangPendidikan,
      jumlah: Number(r.get('jumlah')),
    }))
    .sort((a, b) => b.tahunMulai - a.tahunMulai || b.tahunAjaranId - a.tahunAjaranId || a.jenjangPendidikan.localeCompare(b.jenjangPendidikan))
    .map(({ tahunMulai, ...r }) => r);
};

const list = async ({ tahunAjaranId, jenjang, kategori }) => {
  const semua = tahunAjaranId && jenjang ? await listUntuk(Number(tahunAjaranId), jenjang) : [];
  const [jenjangOptions, periodeTerisi] = await Promise.all([listJenjang(), listPeriodeTerisi()]);
  const kategoriOptions = [...new Set(semua.map((p) => p.kategori).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const data = kategori ? semua.filter((p) => (p.kategori ?? '') === kategori) : semua;
  return { data: data.map(toJson), jenjangOptions, kategoriOptions, periodeTerisi };
};

const assertTahunAjaran = async (id) => {
  if (!(await TahunAjaran.findByPk(id, { attributes: ['id'] }))) throw new ApiError(404, 'Tahun ajaran tidak ditemukan');
};

const create = async (payload, userId) => {
  await assertTahunAjaran(payload.tahunAjaranId);
  const max = await AngketDosenPertanyaan.max('urutan', {
    where: { tahunAjaranId: payload.tahunAjaranId, jenjangPendidikan: payload.jenjangPendidikan },
  });
  const p = await AngketDosenPertanyaan.create({
    tahunAjaranId: payload.tahunAjaranId,
    jenjangPendidikan: payload.jenjangPendidikan,
    kategori: payload.kategori?.trim() || null,
    pertanyaan: payload.pertanyaan.trim(),
    openQuestion: !!payload.openQuestion,
    urutan: payload.urutan ?? (max || 0) + 1,
    createdBy: userId,
    updatedBy: userId,
  });
  return toJson(p);
};

const update = async (id, payload, userId) => {
  const p = await AngketDosenPertanyaan.findByPk(id);
  if (!p) throw new ApiError(404, 'Pertanyaan tidak ditemukan');
  const values = { updatedBy: userId };
  if (payload.kategori !== undefined) values.kategori = payload.kategori?.trim() || null;
  if (payload.pertanyaan !== undefined) values.pertanyaan = payload.pertanyaan.trim();
  if (payload.openQuestion !== undefined) values.openQuestion = !!payload.openQuestion;
  if (payload.urutan !== undefined && payload.urutan !== null) values.urutan = payload.urutan;
  await p.update(values);
  return toJson(p);
};

const remove = async (id) => {
  const jumlah = await AngketDosenPertanyaan.destroy({ where: { id } });
  if (!jumlah) throw new ApiError(404, 'Pertanyaan tidak ditemukan');
};

/**
 * Salin pertanyaan dari periode/jenjang sumber ke tujuan. ganti=true menghapus pertanyaan tujuan
 * terlebih dahulu; selain itu pertanyaan ditambahkan di belakang daftar yang sudah ada.
 */
const salin = async ({ dariTahunAjaranId, dariJenjang, keTahunAjaranId, keJenjang, ganti }, userId) => {
  if (Number(dariTahunAjaranId) === Number(keTahunAjaranId) && dariJenjang === keJenjang) {
    throw new ApiError(400, 'Periode & tingkat pendidikan sumber sama dengan tujuan');
  }
  await assertTahunAjaran(keTahunAjaranId);
  const sumber = await listUntuk(dariTahunAjaranId, dariJenjang);
  if (!sumber.length) throw new ApiError(400, 'Periode sumber belum punya pertanyaan');
  return sequelize.transaction(async (transaction) => {
    const whereTujuan = { tahunAjaranId: keTahunAjaranId, jenjangPendidikan: keJenjang };
    if (ganti) await AngketDosenPertanyaan.destroy({ where: whereTujuan, transaction });
    const awal = ganti ? 0 : (await AngketDosenPertanyaan.max('urutan', { where: whereTujuan, transaction })) || 0;
    await AngketDosenPertanyaan.bulkCreate(
      sumber.map((p, i) => ({
        tahunAjaranId: keTahunAjaranId,
        jenjangPendidikan: keJenjang,
        kategori: p.kategori,
        pertanyaan: p.pertanyaan,
        openQuestion: p.openQuestion,
        urutan: awal + i + 1,
        createdBy: userId,
        updatedBy: userId,
      })),
      { transaction }
    );
    return { disalin: sumber.length };
  });
};

// ---------- Pilihan jawaban (skala nilai, satu untuk semua) ----------

const toJawabanJson = (j) => ({ id: j.id, jawaban: j.jawaban, nilai: j.nilai });

const listJawaban = async () => (await AngketDosenJawaban.findAll({ order: [['nilai', 'DESC'], ['id', 'ASC']] })).map(toJawabanJson);

// Nilai jawaban unik (dicek juga oleh unique index).
const simpanJawaban = async (fnSimpan, nilai) => {
  try {
    return await fnSimpan();
  } catch (err) {
    if (err instanceof UniqueConstraintError) throw new ApiError(400, `Nilai ${nilai} sudah dipakai jawaban lain`);
    throw err;
  }
};

const createJawaban = async (payload, userId) =>
  toJawabanJson(
    await simpanJawaban(
      () => AngketDosenJawaban.create({ jawaban: payload.jawaban.trim(), nilai: payload.nilai, createdBy: userId, updatedBy: userId }),
      payload.nilai
    )
  );

const updateJawaban = async (id, payload, userId) => {
  const j = await AngketDosenJawaban.findByPk(id);
  if (!j) throw new ApiError(404, 'Jawaban tidak ditemukan');
  const values = { updatedBy: userId };
  if (payload.jawaban !== undefined) values.jawaban = payload.jawaban.trim();
  if (payload.nilai !== undefined) values.nilai = payload.nilai;
  await simpanJawaban(() => j.update(values), payload.nilai);
  return toJawabanJson(j);
};

const removeJawaban = async (id) => {
  const jumlah = await AngketDosenJawaban.destroy({ where: { id } });
  if (!jumlah) throw new ApiError(404, 'Jawaban tidak ditemukan');
};

module.exports = { list, listUntuk, create, update, remove, salin, listJawaban, createJawaban, updateJawaban, removeJawaban };
