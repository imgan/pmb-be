const { Krs, KrsDetail, JadwalKuliah, Dosen, KehadiranDosen, KehadiranMahasiswa } = require('../models');
const ApiError = require('../utils/ApiError');

/**
 * Portal mahasiswa — detail jadwal kuliah: realisasi dosen mengajar per pertemuan beserta
 * presensi mandiri ("tombol kehadiran"). Semua query discope ke mahasiswa yang login.
 *
 * Aturan presensi mandiri:
 * - hanya untuk mahasiswa dengan KRS DISETUJUI pada kelas tsb (sama dengan roster presensi dosen);
 * - hanya pertemuan yang dosennya tercatat HADIR;
 * - hanya pada tanggal pertemuan itu sendiri (tidak bisa mengisi pertemuan yang sudah lewat);
 * - hanya selama kelas berjalan: begitu dosen menekan Selesai (jamKeluar terisi), presensi ditutup
 *   dan mahasiswa yang belum presensi dicatat ALPA (lihat dosenPortal.service stopKelas);
 * - kalau dosen sudah mengisi presensi mahasiswa ini, isian dosen yang berlaku (tidak ditimpa).
 */

const TIMEZONE = 'Asia/Jakarta';
const todayLocal = () => new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE }).format(new Date());

const findKrsDetail = (mahasiswaId, jadwalKuliahId) =>
  KrsDetail.findOne({
    where: { jadwalKuliahId },
    include: [{ model: Krs, as: 'krs', required: true, where: { mahasiswaId } }],
  });

const assertTerdaftar = async (mahasiswaId, jadwalKuliahId) => {
  const detail = await findKrsDetail(mahasiswaId, jadwalKuliahId);
  if (!detail) throw new ApiError(404, 'Jadwal kuliah tidak ada di KRS Anda');
  return detail.krs;
};

const namaDosen = (d) => (d ? [d.namaLengkap, d.gelar].filter(Boolean).join(', ') : null);

const getRealisasiJadwal = async (mahasiswaId, jadwalKuliahId) => {
  const krs = await assertTerdaftar(mahasiswaId, jadwalKuliahId);
  const jadwal = await JadwalKuliah.findByPk(jadwalKuliahId, {
    include: [{ model: Dosen, as: 'dosenKordinator', attributes: ['id', 'namaLengkap', 'gelar'], required: false }],
  });
  if (!jadwal) throw new ApiError(404, 'Jadwal kuliah tidak ditemukan');

  const pertemuan = await KehadiranDosen.findAll({
    where: { jadwalKuliahId, isDelete: false },
    include: [{ model: Dosen, as: 'dosen', attributes: ['id', 'namaLengkap', 'gelar'], required: false }],
    order: [
      ['tanggalRealisasi', 'ASC'],
      ['pertemuanKe', 'ASC'],
    ],
  });
  const presensi = pertemuan.length
    ? await KehadiranMahasiswa.findAll({ where: { mahasiswaId, kehadiranDosenId: pertemuan.map((p) => p.id) } })
    : [];
  const presensiByPertemuan = new Map(presensi.map((p) => [p.kehadiranDosenId, p]));

  const today = todayLocal();
  const krsDisetujui = krs.status === 'DISETUJUI';
  const rows = pertemuan.map((p, i) => {
    const mine = presensiByPertemuan.get(p.id);
    const selesai = !!p.jamKeluar;
    let alasanTidakBisa = null;
    if (!krsDisetujui) alasanTidakBisa = 'KRS belum disetujui';
    else if (p.status !== 'HADIR') alasanTidakBisa = 'Dosen tidak hadir';
    else if (p.tanggalRealisasi !== today) alasanTidakBisa = p.tanggalRealisasi > today ? 'Belum dimulai' : 'Sudah lewat';
    else if (selesai) alasanTidakBisa = 'Kelas sudah selesai';
    // Kelas yang sudah selesai tanpa presensi dianggap Alpa.
    const statusSaya = mine?.status ?? (selesai && krsDisetujui && p.status === 'HADIR' ? 'ALPA' : null);
    return {
      kehadiranDosenId: p.id,
      pertemuanKe: p.pertemuanKe ?? i + 1,
      tanggal: p.tanggalRealisasi,
      jamMasuk: p.jamMasuk,
      jamKeluar: p.jamKeluar,
      statusDosen: p.status,
      dosen: namaDosen(p.dosen),
      materi: p.uraian,
      keteranganDosen: p.keterangan,
      statusSaya,
      bisaPresensi: !statusSaya && !alasanTidakBisa,
      alasanTidakBisa: statusSaya ? null : alasanTidakBisa,
    };
  });

  return {
    jadwal: {
      id: jadwal.id,
      kelas: jadwal.kelas,
      kodeMataKuliah: jadwal.kodeMataKuliah,
      namaMataKuliah: jadwal.namaMataKuliah,
      sks: jadwal.sks,
      hari: jadwal.hari,
      jam: jadwal.jam,
      ruangan: jadwal.ruangan,
      dosen: namaDosen(jadwal.dosenKordinator),
    },
    krsStatus: krs.status,
    ringkasan: {
      pertemuan: rows.length,
      hadir: rows.filter((r) => r.statusSaya === 'HADIR').length,
      izinSakit: rows.filter((r) => r.statusSaya === 'IZIN' || r.statusSaya === 'SAKIT').length,
      alpa: rows.filter((r) => r.statusSaya === 'ALPA').length,
    },
    pertemuan: rows,
  };
};

const presensiMandiri = async (mahasiswaId, jadwalKuliahId, kehadiranDosenId) => {
  const krs = await assertTerdaftar(mahasiswaId, jadwalKuliahId);
  if (krs.status !== 'DISETUJUI') throw new ApiError(403, 'KRS Anda untuk kelas ini belum disetujui');

  const realisasi = await KehadiranDosen.findOne({ where: { id: kehadiranDosenId, jadwalKuliahId, isDelete: false } });
  if (!realisasi) throw new ApiError(404, 'Pertemuan tidak ditemukan');
  if (realisasi.status !== 'HADIR') throw new ApiError(400, 'Dosen tidak hadir pada pertemuan ini');
  if (realisasi.tanggalRealisasi !== todayLocal()) {
    throw new ApiError(400, 'Presensi hanya bisa dilakukan pada hari pertemuan berlangsung');
  }
  if (realisasi.jamKeluar) {
    throw new ApiError(400, 'Kelas sudah diselesaikan dosen, presensi ditutup (tercatat Alpa)');
  }

  const [row, created] = await KehadiranMahasiswa.findOrCreate({
    where: { kehadiranDosenId, mahasiswaId },
    defaults: { status: 'HADIR', keterangan: 'Presensi mandiri mahasiswa', createdBy: null, updatedBy: null },
  });
  if (!created) throw new ApiError(409, `Presensi pertemuan ini sudah tercatat (${row.status})`);

  return getRealisasiJadwal(mahasiswaId, jadwalKuliahId);
};

module.exports = { getRealisasiJadwal, presensiMandiri };
