const { Op } = require('sequelize');
const { PendaftarSidang, JadwalSidang, NilaiSidang, KoreksiSidang, PengajuanTa, BimbinganTa, Dosen, Mahasiswa, TahunAjaran } = require('../models');
const ApiError = require('../utils/ApiError');
const { formatTahunAjaran } = require('../utils/tahunAjaran');

/**
 * Portal mahasiswa — Pengajuan Sidang TA/Skripsi. Pendaftaran tersimpan di PendaftarSidang (sama
 * dengan menu Prodi → Pendaftar Sidang): judul & pembimbing diambil dari pengajuan TA yang sudah
 * disetujui, jadwal dipilih dari Jadwal Sidang prodi. Nilai & lembar koreksi diinput dosen.
 */

const hariIni = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const namaDosen = (d) => (d ? [d.namaLengkap, d.gelar].filter(Boolean).join(', ') : null);
const dosenAttrs = ['id', 'namaLengkap', 'gelar'];
const PERAN_LABEL = { PEMBIMBING_1: 'Pembimbing 1', PEMBIMBING_2: 'Pembimbing 2', PENGUJI_1: 'Penguji 1', PENGUJI_2: 'Penguji 2' };

const formatJadwal = (j) =>
  j
    ? {
        id: j.id,
        tanggal: j.tanggal,
        jam: j.jam,
        ruangan: j.ruangan,
        tahunAjaran: formatTahunAjaran(j.tahunAjaran, j.semester),
        penguji: namaDosen(j.dosenPenguji),
      }
    : null;

const includeJadwal = [
  { model: TahunAjaran, as: 'tahunAjaran', attributes: ['id', 'nama', 'jenisSemester'], required: false },
  { model: Dosen.unscoped(), as: 'dosenPenguji', attributes: dosenAttrs, required: false },
];

const getPengajuanDisetujui = (mahasiswaId) =>
  PengajuanTa.findOne({
    where: { mahasiswaId, status: 'DISETUJUI' },
    include: [
      { model: Dosen.unscoped(), as: 'pembimbingUtama', attributes: dosenAttrs, required: false },
      { model: Dosen.unscoped(), as: 'pembimbingPendamping', attributes: dosenAttrs, required: false },
    ],
    order: [['id', 'DESC']],
  });

const getPendaftaran = (mahasiswaId) =>
  PendaftarSidang.findOne({
    where: { mahasiswaId },
    include: [
      { model: JadwalSidang, as: 'jadwalSidang', required: false, include: includeJadwal },
      { model: Dosen.unscoped(), as: 'pembimbing1', attributes: dosenAttrs, required: false },
      { model: Dosen.unscoped(), as: 'pembimbing2', attributes: dosenAttrs, required: false },
      { model: NilaiSidang, as: 'nilaiSidangList', required: false, include: [{ model: Dosen.unscoped(), as: 'dosen', attributes: dosenAttrs, required: false }] },
      { model: KoreksiSidang, as: 'koreksiSidangList', required: false, include: [{ model: Dosen.unscoped(), as: 'dosen', attributes: dosenAttrs, required: false }] },
    ],
    order: [['id', 'DESC']],
  });

const getSidang = async (mahasiswaId) => {
  const mahasiswa = await Mahasiswa.findByPk(mahasiswaId, { attributes: ['id', 'jurusanId'] });
  if (!mahasiswa) throw new ApiError(404, 'Mahasiswa tidak ditemukan');
  const [pengajuan, pendaftaran, jadwalList] = await Promise.all([
    getPengajuanDisetujui(mahasiswaId),
    getPendaftaran(mahasiswaId),
    JadwalSidang.findAll({
      where: { jurusanId: mahasiswa.jurusanId, tanggal: { [Op.gte]: hariIni() } },
      include: includeJadwal,
      order: [['tanggal', 'ASC'], ['jam', 'ASC']],
    }),
  ]);
  const jumlahBimbingan = pengajuan ? await BimbinganTa.count({ where: { pengajuanTaId: pengajuan.id } }) : 0;

  const nilai = (pendaftaran?.nilaiSidangList ?? []).map((n) => ({
    peran: PERAN_LABEL[n.peran] ?? n.peran,
    dosen: namaDosen(n.dosen),
    nilai: n.nilai === null ? null : Number(n.nilai),
    grade: n.grade,
  }));
  const angka = nilai.map((n) => n.nilai).filter((v) => v !== null);
  const sudahDinilai = nilai.length > 0;

  return {
    pengajuanTa: pengajuan
      ? {
          judul: pengajuan.judul,
          pembimbingUtama: namaDosen(pengajuan.pembimbingUtama),
          pembimbingPendamping: namaDosen(pengajuan.pembimbingPendamping),
          jumlahBimbingan,
        }
      : null,
    pendaftaran: pendaftaran
      ? {
          id: pendaftaran.id,
          judul: pendaftaran.judul,
          pembimbing1: namaDosen(pendaftaran.pembimbing1),
          pembimbing2: namaDosen(pendaftaran.pembimbing2),
          tanggalDaftar: pendaftaran.createdAt,
          jadwal: formatJadwal(pendaftaran.jadwalSidang),
          nilai,
          rataRata: angka.length ? Math.round((angka.reduce((s, v) => s + v, 0) / angka.length) * 100) / 100 : null,
          koreksi: (pendaftaran.koreksiSidangList ?? []).map((k) => ({
            id: k.id,
            peran: PERAN_LABEL[k.peran] ?? k.peran,
            dosen: namaDosen(k.dosen),
            babHalaman: k.babHalaman,
            uraian: k.uraian,
            isSelesai: k.isSelesai,
          })),
          // Boleh pindah jadwal / batal selama belum dinilai & tanggal sidang belum lewat.
          bisaDiubah: !sudahDinilai && (!pendaftaran.jadwalSidang || pendaftaran.jadwalSidang.tanggal >= hariIni()),
        }
      : null,
    jadwalTersedia: jadwalList.map(formatJadwal),
  };
};

const assertBisaDiubah = (pendaftaran) => {
  if (pendaftaran.nilaiSidangList?.length) throw new ApiError(400, 'Sidang Anda sudah dinilai; pendaftaran tidak bisa diubah');
  if (pendaftaran.jadwalSidang && pendaftaran.jadwalSidang.tanggal < hariIni()) {
    throw new ApiError(400, 'Tanggal sidang sudah lewat; hubungi prodi untuk penjadwalan ulang');
  }
};

/** Daftar sidang (atau pindah jadwal bila sudah terdaftar dan belum dinilai). */
const daftarSidang = async (mahasiswaId, { jadwalSidangId }) => {
  const mahasiswa = await Mahasiswa.findByPk(mahasiswaId, { attributes: ['id', 'jurusanId'] });
  const pengajuan = await getPengajuanDisetujui(mahasiswaId);
  if (!pengajuan) throw new ApiError(400, 'Pendaftaran judul TA/Skripsi Anda belum disetujui prodi');
  const jadwal = await JadwalSidang.findByPk(jadwalSidangId);
  if (!jadwal || jadwal.jurusanId !== mahasiswa.jurusanId) throw new ApiError(404, 'Jadwal sidang tidak ditemukan untuk prodi Anda');
  if (jadwal.tanggal < hariIni()) throw new ApiError(400, 'Jadwal sidang tersebut sudah lewat');

  const ada = await getPendaftaran(mahasiswaId);
  if (ada) {
    assertBisaDiubah(ada);
    await ada.update({ jadwalSidangId: jadwal.id });
    return { diperbarui: true };
  }
  await PendaftarSidang.create({
    mahasiswaId,
    jadwalSidangId: jadwal.id,
    judul: pengajuan.judul,
    pembimbing1Id: pengajuan.pembimbingUtamaId,
    pembimbing2Id: pengajuan.pembimbingPendampingId,
  });
  return { diperbarui: false };
};

const batalSidang = async (mahasiswaId) => {
  const ada = await getPendaftaran(mahasiswaId);
  if (!ada) throw new ApiError(404, 'Anda belum terdaftar sidang');
  assertBisaDiubah(ada);
  if (ada.koreksiSidangList?.length) throw new ApiError(400, 'Sudah ada lembar koreksi dari dosen; hubungi prodi untuk pembatalan');
  await ada.update({ isDelete: true });
};

module.exports = { getSidang, daftarSidang, batalSidang };
