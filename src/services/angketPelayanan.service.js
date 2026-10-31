const { UniqueConstraintError } = require('sequelize');
const { AngketPelayananPertanyaan, AngketPelayananJawaban, TahunAjaran, Mahasiswa, Jurusan } = require('../models');
const ApiError = require('../utils/ApiError');

// Angket pelayanan: kepuasan mahasiswa terhadap layanan institusi. Wajib diisi sekali per tahun
// ajaran sebelum mahasiswa bisa menyimpan/mengajukan KRS tahun ajaran tsb. Semua fungsi discope ke
// mahasiswaId milik mahasiswa login.

const listPertanyaanAktif = async () =>
  AngketPelayananPertanyaan.findAll({
    where: { isActive: true },
    attributes: ['id', 'kategori', 'pertanyaan', 'urutan'],
    order: [['urutan', 'ASC'], ['id', 'ASC']],
  });

const sudahMengisi = async (mahasiswaId, tahunAjaranId) =>
  !!(await AngketPelayananJawaban.findOne({ where: { mahasiswaId, tahunAjaranId }, attributes: ['id'] }));

const getStatus = async (mahasiswaId, tahunAjaranId) => {
  const sudahDiisi = await sudahMengisi(mahasiswaId, tahunAjaranId);
  return { tahunAjaranId: Number(tahunAjaranId), sudahDiisi, pertanyaan: sudahDiisi ? [] : await listPertanyaanAktif() };
};

const assertSudahMengisi = async (mahasiswaId, tahunAjaranId) => {
  if (!(await sudahMengisi(mahasiswaId, tahunAjaranId))) {
    throw new ApiError(403, 'Isi angket pelayanan terlebih dahulu sebelum mengisi KRS');
  }
};

const submit = async (mahasiswaId, { tahunAjaranId, jawaban, saran }) => {
  const tahunAjaran = await TahunAjaran.findByPk(tahunAjaranId);
  if (!tahunAjaran) throw new ApiError(404, 'Tahun ajaran tidak ditemukan');

  const pertanyaan = await listPertanyaanAktif();
  const skorMap = new Map(jawaban.map((j) => [j.pertanyaanId, j.skor]));
  if (pertanyaan.some((p) => !skorMap.has(p.id))) throw new ApiError(400, 'Seluruh pertanyaan angket wajib dijawab');

  try {
    await AngketPelayananJawaban.create({
      mahasiswaId,
      tahunAjaranId,
      // Hanya pertanyaan aktif yang disimpan.
      jawaban: Object.fromEntries(pertanyaan.map((p) => [p.id, skorMap.get(p.id)])),
      saran: saran?.trim() || null,
    });
  } catch (err) {
    // Submit ganda bersamaan (klik dua kali) — ditolak unique constraint.
    if (err instanceof UniqueConstraintError) throw new ApiError(409, 'Angket pelayanan periode ini sudah diisi');
    throw err;
  }
};

/**
 * Rekap hasil angket pelayanan untuk modul Prodi: jumlah responden, rata-rata skor (1–5) &
 * sebaran jawaban per pertanyaan, dan daftar saran (tanpa nama/NIM — angket bersifat anonim).
 * jurusanId (array dari prodiScope untuk akun Prodi / prodi sesi) membatasi ke prodi tsb.
 */
const getRekap = async ({ tahunAjaranId, jurusanId, angkatan } = {}) => {
  const mahasiswaWhere = { isActive: true };
  if (jurusanId) mahasiswaWhere.jurusanId = jurusanId;
  if (angkatan) mahasiswaWhere.tahunMasuk = Number(angkatan);

  const [pertanyaan, jawabanList, totalMahasiswa] = await Promise.all([
    AngketPelayananPertanyaan.findAll({
      attributes: ['id', 'kategori', 'pertanyaan', 'urutan', 'isActive'],
      order: [
        ['urutan', 'ASC'],
        ['id', 'ASC'],
      ],
    }),
    AngketPelayananJawaban.findAll({
      where: tahunAjaranId ? { tahunAjaranId: Number(tahunAjaranId) } : {},
      include: [
        {
          model: Mahasiswa,
          as: 'mahasiswa',
          attributes: ['id', 'tahunMasuk', 'jurusanId'],
          where: mahasiswaWhere,
          required: true,
          include: [{ model: Jurusan, as: 'jurusan', attributes: ['namaJurusan'], required: false }],
        },
      ],
      order: [['createdAt', 'DESC']],
    }),
    Mahasiswa.count({ where: mahasiswaWhere }),
  ]);

  const statByPertanyaan = new Map(pertanyaan.map((q) => [q.id, { total: 0, n: 0, distribusi: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } }]));
  jawabanList.forEach((j) => {
    const isi = typeof j.jawaban === 'string' ? JSON.parse(j.jawaban) : j.jawaban ?? {};
    Object.entries(isi).forEach(([pid, skor]) => {
      const stat = statByPertanyaan.get(Number(pid));
      if (!stat || !(skor >= 1 && skor <= 5)) return;
      stat.total += skor;
      stat.n += 1;
      stat.distribusi[skor] += 1;
    });
  });

  const rows = pertanyaan
    .map((q) => {
      const stat = statByPertanyaan.get(q.id);
      return {
        id: q.id,
        kategori: q.kategori,
        pertanyaan: q.pertanyaan,
        aktif: q.isActive,
        jumlahJawaban: stat.n,
        rataRata: stat.n ? Math.round((stat.total / stat.n) * 100) / 100 : null,
        distribusi: stat.distribusi,
      };
    })
    .filter((r) => r.aktif || r.jumlahJawaban > 0);
  const terjawab = rows.filter((r) => r.rataRata !== null);

  return {
    responden: jawabanList.length,
    totalMahasiswa,
    rataRataKeseluruhan: terjawab.length
      ? Math.round((terjawab.reduce((sum, r) => sum + r.rataRata, 0) / terjawab.length) * 100) / 100
      : null,
    pertanyaan: rows,
    saran: jawabanList
      .filter((j) => j.saran)
      .map((j) => ({
        id: j.id,
        saran: j.saran,
        prodi: j.mahasiswa?.jurusan?.namaJurusan ?? null,
        angkatan: j.mahasiswa?.tahunMasuk ?? null,
        tanggal: j.createdAt,
      })),
  };
};

// ---------- Kelola pertanyaan (modul Prodi) ----------
// Pertanyaan berlaku untuk semua prodi. Jawaban disimpan sebagai JSON { pertanyaanId: skor }, jadi
// pertanyaan yang sudah pernah dijawab tidak boleh dihapus (rekap lama rusak) — nonaktifkan saja.

/** Jumlah jawaban per pertanyaan dari seluruh isian angket. */
const hitungJawabanPerPertanyaan = async () => {
  const list = await AngketPelayananJawaban.findAll({ attributes: ['jawaban'], raw: true });
  const count = new Map();
  list.forEach((j) => {
    const isi = typeof j.jawaban === 'string' ? JSON.parse(j.jawaban) : j.jawaban ?? {};
    Object.keys(isi).forEach((pid) => count.set(Number(pid), (count.get(Number(pid)) ?? 0) + 1));
  });
  return count;
};

const toPertanyaanJson = (p, count) => ({
  id: p.id,
  kategori: p.kategori,
  pertanyaan: p.pertanyaan,
  urutan: p.urutan,
  isActive: p.isActive,
  jumlahJawaban: count.get(p.id) ?? 0,
  updatedAt: p.updatedAt,
});

const listPertanyaan = async ({ search, kategori, status } = {}) => {
  const [list, count] = await Promise.all([
    AngketPelayananPertanyaan.findAll({ order: [['urutan', 'ASC'], ['id', 'ASC']] }),
    hitungJawabanPerPertanyaan(),
  ]);
  const q = String(search ?? '').trim().toLowerCase();
  const data = list
    .filter((p) => !q || [p.pertanyaan, p.kategori].some((v) => (v ?? '').toLowerCase().includes(q)))
    .filter((p) => !kategori || (p.kategori ?? '') === kategori)
    .filter((p) => !status || (status === 'AKTIF' ? p.isActive : !p.isActive))
    .map((p) => toPertanyaanJson(p, count));
  const kategoriList = [...new Set(list.map((p) => p.kategori).filter(Boolean))].sort((x, y) => x.localeCompare(y));
  return { data, kategoriList };
};

const normalisasi = (payload) => ({
  kategori: payload.kategori?.trim() || null,
  pertanyaan: payload.pertanyaan.trim(),
  isActive: payload.isActive ?? true,
});

const createPertanyaan = async (payload) => {
  // Urutan kosong = taruh paling akhir.
  const urutan = payload.urutan ?? ((await AngketPelayananPertanyaan.max('urutan')) || 0) + 1;
  const p = await AngketPelayananPertanyaan.create({ ...normalisasi(payload), urutan });
  return toPertanyaanJson(p, new Map());
};

const updatePertanyaan = async (id, payload) => {
  const p = await AngketPelayananPertanyaan.findByPk(id);
  if (!p) throw new ApiError(404, 'Pertanyaan tidak ditemukan');
  await p.update({ ...normalisasi({ ...p.toJSON(), ...payload }), urutan: payload.urutan ?? p.urutan });
  return toPertanyaanJson(p, await hitungJawabanPerPertanyaan());
};

const deletePertanyaan = async (id) => {
  const p = await AngketPelayananPertanyaan.findByPk(id);
  if (!p) throw new ApiError(404, 'Pertanyaan tidak ditemukan');
  const jumlah = (await hitungJawabanPerPertanyaan()).get(p.id) ?? 0;
  if (jumlah) {
    throw new ApiError(400, `Pertanyaan sudah dijawab ${jumlah} mahasiswa sehingga tidak bisa dihapus — nonaktifkan saja agar tidak tampil lagi`);
  }
  await p.destroy();
};

module.exports = {
  listPertanyaanAktif,
  getStatus,
  assertSudahMengisi,
  submit,
  getRekap,
  listPertanyaan,
  createPertanyaan,
  updatePertanyaan,
  deletePertanyaan,
};
