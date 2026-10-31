const { Op } = require('sequelize');
const { Mahasiswa, MahasiswaBiodata, PembimbingAkademik, Jurusan, GolonganKelas, Krs, KrsDetail, JadwalKuliah, TahunAjaran } = require('../models');
const ApiError = require('../utils/ApiError');
const { formatTahunAjaran } = require('../utils/tahunAjaran');
const { getTranskrip } = require('./mahasiswaPortal.service');

/**
 * Portal dosen — Lain-Lain → Mahasiswa Bimbingan Akademik: mahasiswa yang pembimbing akademiknya
 * dosen login (mahasiswa.pembimbingAkademikId -> pembimbing_akademik.dosenId), dengan ringkasan
 * IPK, KRS terakhir, biodata (tanpa data sensitif) dan cetak KHS.
 */

const mahasiswaIdsPa = async (dosenId) => {
  const pa = await PembimbingAkademik.findAll({ where: { dosenId }, attributes: ['id'] });
  if (!pa.length) return [];
  const rows = await Mahasiswa.findAll({ where: { pembimbingAkademikId: { [Op.in]: pa.map((p) => p.id) } }, attributes: ['id'], raw: true });
  return rows.map((r) => r.id);
};

const assertMahasiswaPa = async (dosenId, mahasiswaId) => {
  const ids = await mahasiswaIdsPa(dosenId);
  if (!ids.includes(Number(mahasiswaId))) throw new ApiError(404, 'Mahasiswa ini bukan bimbingan akademik Anda');
};

const listMahasiswaPa = async (dosenId) => {
  const ids = await mahasiswaIdsPa(dosenId);
  if (!ids.length) return [];
  const [mahasiswa, krsList] = await Promise.all([
    Mahasiswa.findAll({
      where: { id: ids },
      attributes: ['id', 'nim', 'namaLengkap', 'noTelepon', 'email', 'tahunMasuk', 'isActive', 'statusKeluar'],
      include: [
        { model: Jurusan, as: 'jurusan', attributes: ['namaJurusan'], required: false },
        { model: GolonganKelas.unscoped(), as: 'golonganKelas', attributes: ['namaKelas'], required: false },
      ],
      order: [['nim', 'ASC']],
    }),
    Krs.findAll({
      where: { mahasiswaId: ids },
      include: [{ model: TahunAjaran, as: 'tahunAjaran', required: false }],
      order: [['semester', 'DESC'], ['id', 'DESC']],
    }),
  ]);
  const krsTerakhir = new Map();
  krsList.forEach((k) => {
    if (!krsTerakhir.has(k.mahasiswaId)) krsTerakhir.set(k.mahasiswaId, k);
  });
  const transkrip = await Promise.all(mahasiswa.map((m) => getTranskrip(m.id).catch(() => null)));
  return mahasiswa.map((m, i) => {
    const krs = krsTerakhir.get(m.id);
    return {
      id: m.id,
      nim: m.nim,
      namaLengkap: m.namaLengkap,
      noTelepon: m.noTelepon,
      email: m.email,
      prodi: m.jurusan?.namaJurusan ?? null,
      kelas: m.golonganKelas?.namaKelas ?? null,
      angkatan: m.tahunMasuk,
      status: m.statusKeluar ?? (m.isActive ? 'AKTIF' : 'NONAKTIF'),
      ipk: transkrip[i]?.ipk ?? null,
      totalSks: transkrip[i]?.totalSks ?? 0,
      krsTerakhir: krs
        ? { id: krs.id, semester: krs.semester, tahunAjaran: formatTahunAjaran(krs.tahunAjaran), status: krs.status }
        : null,
    };
  });
};

// Data biodata lama memakai "0" untuk isian kosong.
const isi = (v) => (v === null || v === undefined || String(v).trim() === '' || String(v).trim() === '0' ? null : v);

/** Biodata ringkas untuk dosen PA (tanpa NIK/KTP, NPWP, penghasilan orang tua). */
const getBiodataPa = async (dosenId, mahasiswaId) => {
  await assertMahasiswaPa(dosenId, mahasiswaId);
  const [m, b] = await Promise.all([
    Mahasiswa.findByPk(mahasiswaId, {
      attributes: ['id', 'nim', 'namaLengkap', 'noTelepon', 'email', 'tahunMasuk'],
      include: [{ model: Jurusan, as: 'jurusan', attributes: ['namaJurusan'], required: false }],
    }),
    MahasiswaBiodata.findOne({ where: { mahasiswaId } }),
  ]);
  const alamat = b
    ? [isi(b.jalan), isi(b.rt) || isi(b.rw) ? `RT ${isi(b.rt) ?? '-'}/RW ${isi(b.rw) ?? '-'}` : null, isi(b.dusun), isi(b.kelurahan), isi(b.kecamatan), isi(b.propinsi), isi(b.kodePos)].filter(Boolean).join(', ')
    : null;
  return {
    nim: m.nim,
    namaLengkap: m.namaLengkap,
    prodi: m.jurusan?.namaJurusan ?? null,
    angkatan: m.tahunMasuk,
    hp: isi(b?.hp) || m.noTelepon,
    email: isi(b?.email) || m.email,
    tempatLahir: isi(b?.tempatLahir),
    tanggalLahir: isi(b?.tanggalLahir),
    jenisKelamin: isi(b?.jenisKelamin),
    agama: isi(b?.agama),
    alamat: alamat || null,
    teleponRumah: isi(b?.teleponRumah),
    waktuKuliah: isi(b?.waktuKuliah),
    namaAyah: isi(b?.namaAyah),
    pekerjaanAyah: isi(b?.pekerjaanAyah),
    namaIbu: isi(b?.namaIbu),
    pekerjaanIbu: isi(b?.pekerjaanIbu),
    namaWali: isi(b?.namaWali),
  };
};

/** Mata kuliah KRS terakhir mahasiswa bimbingan (FRS). */
const getKrsTerakhirPa = async (dosenId, mahasiswaId) => {
  await assertMahasiswaPa(dosenId, mahasiswaId);
  const krs = await Krs.findOne({
    where: { mahasiswaId },
    include: [
      { model: TahunAjaran, as: 'tahunAjaran', required: false },
      {
        model: KrsDetail,
        as: 'detailList',
        required: false,
        include: [{ model: JadwalKuliah, as: 'kelasKuliah', attributes: ['kelas', 'kodeMataKuliah', 'namaMataKuliah', 'sks', 'semester'], required: false }],
      },
    ],
    order: [['semester', 'DESC'], ['id', 'DESC']],
  });
  if (!krs) return null;
  const mataKuliah = (krs.detailList ?? [])
    .map((d) => d.kelasKuliah)
    .filter(Boolean)
    .map((j) => ({ kodeMataKuliah: j.kodeMataKuliah, namaMataKuliah: j.namaMataKuliah, kelas: j.kelas, sks: j.sks ?? 0, semester: j.semester }));
  return {
    semester: krs.semester,
    tahunAjaran: formatTahunAjaran(krs.tahunAjaran),
    status: krs.status,
    totalSks: mataKuliah.reduce((s, m) => s + m.sks, 0),
    mataKuliah,
  };
};

module.exports = { listMahasiswaPa, assertMahasiswaPa, getBiodataPa, getKrsTerakhirPa };
