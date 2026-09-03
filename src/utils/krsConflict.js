const { JadwalKuliah } = require('../models');
const ApiError = require('./ApiError');

const hasOverlap = (a, b) => {
  if (!a?.length || !b?.length) return false;
  return a.some((day) => b.includes(day));
};

/**
 * Mahasiswa tidak boleh mengambil dua jadwal yang mata kuliahnya sama (dua kelas paralel
 * dari mata kuliah yang sama), atau dua jadwal yang jadwalnya bentrok (hari yang sama +
 * jam yang sama). Kelas dengan `hari`/`jam` yang belum diisi (null) dilewati dari pengecekan
 * bentrok karena datanya belum cukup untuk memastikan ada tabrakan — jangan sampai memblokir
 * pemilihan yang sebenarnya valid hanya karena data jadwal belum lengkap.
 */
const assertNoConflict = async (jadwalKuliahIds = []) => {
  const ids = [...new Set(jadwalKuliahIds)];
  if (ids.length < 2) return;

  const rows = await JadwalKuliah.findAll({ where: { id: ids } });

  const byMataKuliah = new Map();
  rows.forEach((j) => {
    const key = j.mataKuliahId ?? `kode:${j.kodeMataKuliah}`;
    const list = byMataKuliah.get(key) ?? [];
    list.push(j);
    byMataKuliah.set(key, list);
  });
  const duplicate = [...byMataKuliah.values()].find((list) => list.length > 1);
  if (duplicate) {
    throw new ApiError(
      400,
      `Tidak bisa mengambil lebih dari satu kelas untuk mata kuliah yang sama: ${duplicate[0].namaMataKuliah} (kelas ${duplicate.map((j) => j.kelas).join(', ')})`
    );
  }

  for (let i = 0; i < rows.length; i += 1) {
    for (let j = i + 1; j < rows.length; j += 1) {
      const a = rows[i];
      const b = rows[j];
      if (a.jam == null || b.jam == null || a.jam !== b.jam) continue;
      if (!hasOverlap(a.hari, b.hari)) continue;
      throw new ApiError(
        400,
        `Jadwal bentrok: [${a.kodeMataKuliah}] ${a.namaMataKuliah} (kelas ${a.kelas}) dengan [${b.kodeMataKuliah}] ${b.namaMataKuliah} (kelas ${b.kelas})`
      );
    }
  }
};

module.exports = { assertNoConflict };
