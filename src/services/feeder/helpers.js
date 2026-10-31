const { KODE_PRODI_BY_PREFIX_KELAS } = require('../../utils/prodiJadwal');
const { MataKuliah, Kurikulum, Jurusan } = require('../../models');

/** Periode Feeder dari TahunAjaran: tahun awal + 1 (ganjil) / 2 (genap), mis. "20261". */
const periodeFromTahunAjaran = (tahunAjaran) =>
  tahunAjaran ? `${tahunAjaran.tahunMulai}${tahunAjaran.jenisSemester === 'GENAP' ? 2 : 1}` : '';

/**
 * Periode Feeder dari tahun masuk + nomor semester mahasiswa (NilaiMahasiswa tidak menyimpan
 * TahunAjaran per baris) — sama dengan cara KHS menurunkan Tahun Ajaran (laporanKhs.service.js).
 */
const periodeFromSemester = (tahunMasuk, semester) => {
  if (!tahunMasuk || !semester) return '';
  const tahun = Number(tahunMasuk) + Math.floor((Number(semester) - 1) / 2);
  return `${tahun}${Number(semester) % 2 === 0 ? 2 : 1}`;
};

/**
 * Periode Feeder dari sebuah tanggal, mengikuti kalender akademik: Agustus–Januari = semester
 * ganjil TA yang dimulai tahun itu (Januari ikut TA tahun sebelumnya), Februari–Juli = genap.
 */
const periodeFromDate = (value) => {
  const d = value ? new Date(value) : null;
  if (!d || Number.isNaN(d.getTime())) return null;
  const month = d.getMonth(); // 0 = Januari
  if (month >= 7) return `${d.getFullYear()}1`;
  if (month === 0) return `${d.getFullYear() - 1}1`;
  return `${d.getFullYear() - 1}2`;
};

/**
 * Peta kode MK -> Kode Prodi: prodi mata kuliah = prodi kurikulum induknya (MataKuliah → Kurikulum →
 * Jurusan), dicocokkan lewat kode MK (kode yang dipakai beberapa prodi → prodi pertama yang ditemukan).
 */
const loadKodeProdiByKodeMk = async () => {
  const rows = await MataKuliah.findAll({
    attributes: ['id', 'kode', 'kurikulumId'],
    include: [
      {
        model: Kurikulum,
        as: 'kurikulum',
        attributes: ['id', 'jurusanId'],
        required: true,
        include: [{ model: Jurusan, as: 'jurusan', attributes: ['kodeProdi'], required: false }],
      },
    ],
  });
  const map = new Map();
  rows.forEach((m) => {
    const kodeProdi = m.kurikulum?.jurusan?.kodeProdi;
    if (!map.has(m.kode) && kodeProdi) map.set(m.kode, kodeProdi);
  });
  return map;
};

/**
 * Kode prodi sebuah kelas kuliah: dari awalan nama kelas (F/L/A/T, aturan yang sama dengan pembatasan
 * KRS per prodi) — akurat juga untuk MK umum (MKU) yang dipakai banyak prodi. Bila awalan tidak dikenal,
 * pakai kurikulum yang memuat kode MK tsb (`prodiMap` dari loadKodeProdiByKodeMk).
 */
const kodeProdiKelas = (kelas, kodeMk, prodiMap) =>
  KODE_PRODI_BY_PREFIX_KELAS[String(kelas ?? '').trim().charAt(0).toUpperCase()] ?? prodiMap.get(kodeMk) ?? '';

/** Filter (search teks di semua kolom) + paginasi untuk sumber data yang dirakit di memori. */
const paginateRows = (rows, { search, offset, limit }) => {
  const term = String(search ?? '').trim().toLowerCase();
  const filtered = term
    ? rows.filter((r) => Object.values(r).some((v) => v !== null && v !== undefined && String(v).toLowerCase().includes(term)))
    : rows;
  return { rows: filtered.slice(offset, offset + limit), count: filtered.length };
};

const round2 = (n) => Math.round(n * 100) / 100;

module.exports = {
  kodeProdiKelas, periodeFromTahunAjaran, periodeFromSemester, periodeFromDate, loadKodeProdiByKodeMk, paginateRows, round2 };
