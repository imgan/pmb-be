/**
 * Prodi (kode prodi) sebuah jadwal kuliah: dari kurikulum mata kuliahnya; jadwal lama / hasil
 * import tanpa mata kuliah memakai awalan nama kelas sesuai penamaan kelas Poltek
 * (F25 = Farmasi, L24 = Manajemen Logistik, A26 = Adm. Rumah Sakit, T25 = TRM).
 * Dipakai untuk membatasi pilihan KRS (portal mahasiswa & BAAK) ke prodi mahasiswa.
 */
const { sequelize, Mahasiswa, Jurusan } = require('../models');
const ApiError = require('./ApiError');

const KODE_PRODI_BY_PREFIX_KELAS = { F: '48401', L: '63414', A: '13461', T: '90346' };

const prefixKelasFor = (kodeProdi) =>
  Object.entries(KODE_PRODI_BY_PREFIX_KELAS).find(([, kode]) => kode === kodeProdi)?.[0] ?? null;

/** Kode prodi dari objek jadwal yang sudah meng-include mataKuliah.kurikulum.jurusan. */
const kodeProdiJadwal = (j) =>
  j.mataKuliah?.kurikulum?.jurusan?.kodeProdi ?? KODE_PRODI_BY_PREFIX_KELAS[String(j.kelas ?? '').trim().charAt(0).toUpperCase()] ?? null;

/** Id jadwal kuliah milik satu prodi (dicek di database, cocok untuk filter query berpaginasi). */
const jadwalIdsForProdi = async (kodeProdi) => {
  if (!kodeProdi) return [];
  const prefix = prefixKelasFor(kodeProdi);
  const rows = await sequelize.query(
    `SELECT j.id
       FROM jadwal_kuliah j
       LEFT JOIN mata_kuliah m ON m.id = j.mata_kuliah_id
       LEFT JOIN kurikulum k ON k.id = m.kurikulum_id
       LEFT JOIN jurusan jr ON jr.id = k.jurusan_id
      WHERE jr.kode_prodi = :kodeProdi
         OR (j.mata_kuliah_id IS NULL AND :prefix IS NOT NULL AND UPPER(LEFT(TRIM(j.kelas), 1)) = :prefix)`,
    { replacements: { kodeProdi, prefix }, type: sequelize.QueryTypes.SELECT }
  );
  return rows.map((r) => r.id);
};

const kodeProdiMahasiswa = async (mahasiswaId) => {
  const mahasiswa = await Mahasiswa.findByPk(mahasiswaId, { include: [{ model: Jurusan, as: 'jurusan', required: false }] });
  if (!mahasiswa) throw new ApiError(404, 'Mahasiswa tidak ditemukan');
  return mahasiswa.jurusan?.kodeProdi ?? null;
};

/** Tolak jadwal yang bukan dari prodi mahasiswa (dipakai saat simpan KRS). */
const assertJadwalSesuaiProdi = async (mahasiswaId, jadwalKuliahIds) => {
  if (!jadwalKuliahIds?.length) return;
  const allowed = new Set(await jadwalIdsForProdi(await kodeProdiMahasiswa(mahasiswaId)));
  if (jadwalKuliahIds.some((id) => !allowed.has(Number(id)))) {
    throw new ApiError(400, 'Sebagian kelas kuliah bukan dari prodi mahasiswa ini');
  }
};

module.exports = { KODE_PRODI_BY_PREFIX_KELAS, kodeProdiJadwal, jadwalIdsForProdi, kodeProdiMahasiswa, assertJadwalSesuaiProdi };
