const { Op } = require('sequelize');
const { PendaftarSidang, NilaiSidang, JadwalSidang, Mahasiswa } = require('../models');
const ApiError = require('../utils/ApiError');
const { gradeFor } = require('../utils/gradeScale');

// Urutan peran = urutan baris di Rekapitulasi Nilai Sidang.
const PERAN_LIST = ['PEMBIMBING_1', 'PEMBIMBING_2', 'PENGUJI_1', 'PENGUJI_2'];

/**
 * Peran dosen pada satu pendaftar sidang. Pembimbing dari PendaftarSidang, penguji dari
 * JadwalSidang (baru menyimpan satu penguji, jadi PENGUJI_2 belum bisa dimiliki siapa pun).
 */
const dosenIdByPeran = (pendaftar) => ({
  PEMBIMBING_1: pendaftar.pembimbing1Id ?? null,
  PEMBIMBING_2: pendaftar.pembimbing2Id ?? null,
  PENGUJI_1: pendaftar.jadwalSidang?.dosenPengujiId ?? null,
  PENGUJI_2: null,
});

const round2 = (n) => Math.round(n * 100) / 100;

/**
 * Nilai akhir = rata-rata nilai dari semua peran yang punya dosen. Baru dihitung bila seluruh
 * dosen tsb sudah menginput nilai — rata-rata parsial akan menyesatkan di dokumen resmi.
 */
const hitungNilaiAkhir = (pendaftar, nilaiList) => {
  const peranTerisi = Object.entries(dosenIdByPeran(pendaftar))
    .filter(([, dosenId]) => dosenId)
    .map(([peran]) => peran);
  if (!peranTerisi.length) return null;
  const byPeran = new Map(nilaiList.map((n) => [n.peran, n]));
  if (!peranTerisi.every((p) => byPeran.has(p))) return null;
  const nilai = round2(peranTerisi.reduce((sum, p) => sum + byPeran.get(p).nilai, 0) / peranTerisi.length);
  return { nilai, grade: gradeFor(nilai) };
};

const includeJadwal = { model: JadwalSidang, as: 'jadwalSidang', attributes: ['id', 'tanggal', 'jam', 'ruangan', 'dosenPengujiId'] };

/** Daftar mahasiswa yang dibimbing/diuji dosen, satu baris per (pendaftar, peran dosen). */
const listForDosen = async (dosenId) => {
  const pendaftarList = await PendaftarSidang.findAll({
    where: {
      [Op.or]: [
        { pembimbing1Id: dosenId },
        { pembimbing2Id: dosenId },
        { '$jadwalSidang.dosen_penguji_id$': dosenId },
      ],
    },
    include: [
      includeJadwal,
      { model: Mahasiswa, as: 'mahasiswa', attributes: ['id', 'nim', 'namaLengkap'] },
      { model: NilaiSidang, as: 'nilaiSidangList', required: false },
    ],
    order: [['id', 'DESC']],
  });

  return pendaftarList.flatMap((p) => {
    const byPeran = dosenIdByPeran(p);
    return PERAN_LIST.filter((peran) => byPeran[peran] === dosenId).map((peran) => {
      const nilai = p.nilaiSidangList.find((n) => n.peran === peran);
      return {
        pendaftarSidangId: p.id,
        peran,
        judul: p.judul,
        mahasiswa: p.mahasiswa,
        jadwalSidang: p.jadwalSidang
          ? { tanggal: p.jadwalSidang.tanggal, jam: p.jadwalSidang.jam, ruangan: p.jadwalSidang.ruangan }
          : null,
        nilai: nilai?.nilai ?? null,
        grade: nilai?.grade ?? null,
      };
    });
  });
};

/** Simpan/ubah nilai; dosen hanya boleh menilai peran yang memang miliknya. */
const saveForDosen = async (dosenId, pendaftarSidangId, { peran, nilai }) => {
  const pendaftar = await PendaftarSidang.findByPk(pendaftarSidangId, { include: [includeJadwal] });
  if (!pendaftar) throw new ApiError(404, 'Pendaftar sidang tidak ditemukan');
  if (dosenIdByPeran(pendaftar)[peran] !== dosenId) {
    throw new ApiError(403, 'Anda tidak terdaftar sebagai dosen dengan peran ini pada sidang tersebut');
  }

  const values = { dosenId, nilai, grade: gradeFor(nilai) };
  const existing = await NilaiSidang.findOne({ where: { pendaftarSidangId, peran } });
  if (existing) await existing.update(values);
  else await NilaiSidang.create({ pendaftarSidangId, peran, ...values });
  return { pendaftarSidangId: Number(pendaftarSidangId), peran, nilai, grade: values.grade };
};

/** Nilai per peran (urut PERAN_LIST) + nilai akhir, untuk Rekapitulasi Nilai Sidang. */
const getRekap = async (pendaftar) => {
  const nilaiList = await NilaiSidang.findAll({ where: { pendaftarSidangId: pendaftar.id } });
  const byPeran = new Map(nilaiList.map((n) => [n.peran, n]));
  return {
    perPeran: PERAN_LIST.map((peran) => {
      const n = byPeran.get(peran);
      return n ? { nilai: n.nilai, grade: n.grade } : null;
    }),
    nilaiAkhir: hitungNilaiAkhir(pendaftar, nilaiList),
  };
};

module.exports = { PERAN_LIST, dosenIdByPeran, includeJadwal, listForDosen, saveForDosen, getRekap };
