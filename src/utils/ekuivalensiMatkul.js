const { Op } = require('sequelize');
const { KonversiKurikulum, MataKuliah } = require('../models');
const { GRADE_BOBOT } = require('./gradeScale');

/**
 * Ekuivalensi mata kuliah antar kurikulum, bersumber dari Master Konversi Kurikulum (Prodi).
 *
 * Mahasiswa yang mengulang mata kuliah kurikulum lama di semester aktif mengambil kelas mata
 * kuliah PENGGANTI-nya di kurikulum baru (kode berbeda). nilai_mahasiswa hanya menyimpan
 * kode_mata_kuliah, jadi tanpa ekuivalensi nilai lama & nilai ulang terhitung dua kali di
 * IPK/total SKS. Di sini setiap kode dipetakan ke satu "kelompok" (union-find atas pasangan
 * dari -> ke, berantai: 2018 -> 2020 -> 2022 jadi satu kelompok), lalu per kelompok hanya satu
 * nilai yang diakui (lihat pilihNilaiEfektif).
 */
const loadKelompokKode = async () => {
  const pairs = await KonversiKurikulum.findAll({
    where: { keMataKuliahId: { [Op.ne]: null } },
    include: [
      { model: MataKuliah.scope('withDeleted'), as: 'dariMataKuliah', attributes: ['id', 'kode'], required: true },
      { model: MataKuliah.scope('withDeleted'), as: 'keMataKuliah', attributes: ['id', 'kode'], required: true },
    ],
  });

  const parent = new Map();
  const find = (kode) => {
    let root = kode;
    while (parent.has(root) && parent.get(root) !== root) root = parent.get(root);
    let cur = kode;
    while (parent.has(cur) && parent.get(cur) !== root) {
      const next = parent.get(cur);
      parent.set(cur, root);
      cur = next;
    }
    return root;
  };
  pairs.forEach((p) => {
    const a = find(p.dariMataKuliah.kode);
    const b = find(p.keMataKuliah.kode);
    if (!parent.has(a)) parent.set(a, a);
    if (a !== b) parent.set(b, a);
  });

  return (kode) => find(kode);
};

// Aturan mengulang: yang diakui adalah nilai TERBAIK; kalau sama, nilai yang paling akhir diambil.
const lebihBaik = (a, b) => {
  const bobotA = GRADE_BOBOT[a.grade] ?? 0;
  const bobotB = GRADE_BOBOT[b.grade] ?? 0;
  if (bobotA !== bobotB) return bobotA > bobotB;
  return (a.semester ?? 0) >= (b.semester ?? 0);
};

/**
 * Dari daftar nilai (boleh campuran banyak mahasiswa) kembalikan Set berisi nilai yang diakui:
 * satu per (mahasiswaId, kelompok kode). Baris butuh kodeMataKuliah, grade, semester, mahasiswaId.
 */
const nilaiDiakuiSet = (nilaiList, kelompokOf) => {
  const terbaik = new Map();
  nilaiList.forEach((n) => {
    const key = `${n.mahasiswaId}|${kelompokOf(n.kodeMataKuliah)}`;
    const current = terbaik.get(key);
    if (!current || lebihBaik(n, current)) terbaik.set(key, n);
  });
  return new Set(terbaik.values());
};

const pilihNilaiEfektif = (nilaiList, kelompokOf) => {
  const diakui = nilaiDiakuiSet(nilaiList, kelompokOf);
  return nilaiList.filter((n) => diakui.has(n));
};

module.exports = { loadKelompokKode, nilaiDiakuiSet, pilihNilaiEfektif };
