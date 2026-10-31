const { JadwalKuliah, Dosen, KehadiranDosen, KehadiranMahasiswa, Krs, KrsDetail, Kurikulum, MataKuliah, Jurusan, Mahasiswa, GolonganKelas, TahunAjaran } = require('../models');
const ApiError = require('../utils/ApiError');
const { kodeProdiJadwal } = require('../utils/prodiJadwal');
const { loadPenandatanganProdi } = require('../utils/kaprodi');

const getJadwalWithContext = async (jadwalKuliahId) => {
  const jadwal = await JadwalKuliah.findByPk(jadwalKuliahId, {
    // unscoped + required:false: default scope Dosen (isDelete=false) membuat join jadi wajib, sehingga
    // jadwal tanpa dosen pengampu tambahan (atau dosennya sudah dihapus) dianggap "tidak ditemukan".
    include: [
      { model: Dosen.unscoped(), as: 'dosenKordinator', required: false },
      { model: Dosen.unscoped(), as: 'dosenPengampu', through: { attributes: [] }, required: false },
      { model: TahunAjaran, as: 'tahunAjaran', attributes: ['id', 'nama', 'jenisSemester'], required: false },
      {
        model: MataKuliah,
        as: 'mataKuliah',
        attributes: ['id', 'kurikulumId'],
        required: false,
        include: [
          {
            model: Kurikulum,
            as: 'kurikulum',
            attributes: ['id', 'jurusanId'],
            required: false,
            include: [{ model: Jurusan, as: 'jurusan', attributes: ['kodeProdi'], required: false }],
          },
        ],
      },
    ],
  });
  if (!jadwal) throw new ApiError(404, 'Jadwal kuliah not found');
  return jadwal;
};

/**
 * Realisasi mengajar per pertemuan + jumlah mahasiswa hadir ("hadir of peserta"). Peserta = KRS
 * disetujui pada kelas ini; hanya presensi HADIR peserta tsb yang dihitung (sama dengan portal dosen).
 */
const getRealisasiRows = async (jadwalKuliahId) => {
  const [rows, roster] = await Promise.all([
    KehadiranDosen.findAll({
      where: { jadwalKuliahId },
      include: [{ model: Dosen.unscoped(), as: 'dosen', required: false }],
      order: [
        ['tanggalRealisasi', 'ASC'],
        ['jamMasuk', 'ASC'],
        ['id', 'ASC'],
      ],
    }),
    KrsDetail.findAll({
      where: { jadwalKuliahId },
      attributes: ['id'],
      include: [{ model: Krs, as: 'krs', required: true, attributes: ['mahasiswaId'], where: { status: 'DISETUJUI' } }],
    }),
  ]);
  const peserta = new Set(roster.map((r) => r.krs.mahasiswaId));
  const hadir = rows.length
    ? await KehadiranMahasiswa.findAll({
        attributes: ['kehadiranDosenId', 'mahasiswaId'],
        where: { kehadiranDosenId: rows.map((r) => r.id), status: 'HADIR' },
        raw: true,
      })
    : [];
  const hadirBy = new Map();
  hadir
    .filter((h) => peserta.has(h.mahasiswaId))
    .forEach((h) => hadirBy.set(h.kehadiranDosenId, (hadirBy.get(h.kehadiranDosenId) ?? 0) + 1));
  return rows.map((r) => Object.assign(r, { jumlahHadir: hadirBy.get(r.id) ?? 0, jumlahPeserta: peserta.size }));
};

/**
 * Data Daftar Hadir Mahasiswa satu kelas: peserta (KRS disetujui, urut NIM) beserta sistem kuliahnya,
 * pertemuan yang sudah direalisasikan (urut tanggal), dan presensi HADIR per pertemuan.
 */
const getDaftarHadir = async (jadwalKuliahId) => {
  const [roster, pertemuan] = await Promise.all([
    KrsDetail.findAll({
      where: { jadwalKuliahId },
      attributes: ['id'],
      include: [
        {
          model: Krs,
          as: 'krs',
          required: true,
          attributes: ['mahasiswaId'],
          where: { status: 'DISETUJUI' },
          include: [
            {
              model: Mahasiswa,
              as: 'mahasiswa',
              required: true,
              attributes: ['id', 'nim', 'namaLengkap'],
              include: [{ model: GolonganKelas, as: 'golonganKelas', attributes: ['namaKelas'], required: false }],
            },
          ],
        },
      ],
    }),
    KehadiranDosen.findAll({
      where: { jadwalKuliahId },
      attributes: ['id', 'tanggalRealisasi', 'pertemuanKe'],
      order: [
        ['tanggalRealisasi', 'ASC'],
        ['jamMasuk', 'ASC'],
        ['id', 'ASC'],
      ],
    }),
  ]);
  const hadir = pertemuan.length
    ? await KehadiranMahasiswa.findAll({
        attributes: ['kehadiranDosenId', 'mahasiswaId'],
        where: { kehadiranDosenId: pertemuan.map((p) => p.id), status: 'HADIR' },
        raw: true,
      })
    : [];
  const hadirSet = new Set(hadir.map((h) => `${h.mahasiswaId}|${h.kehadiranDosenId}`));
  const mahasiswa = roster
    .map((r) => r.krs.mahasiswa)
    .sort((a, b) => a.nim.localeCompare(b.nim))
    .map((m) => ({
      nim: m.nim,
      namaLengkap: m.namaLengkap,
      // S = Shift (kelas non-Reguler: Karyawan/Malam/Shubuh), N = Reguler.
      ket: !m.golonganKelas || /reguler/i.test(m.golonganKelas.namaKelas) ? 'N' : 'S',
      hadir: pertemuan.map((p) => hadirSet.has(`${m.id}|${p.id}`)),
    }));
  return { tanggal: pertemuan.map((p) => p.tanggalRealisasi), mahasiswa };
};

/** Nama prodi & Kaprodi untuk kolom tanda tangan template (otomatis dari prodi jadwal). */
const getPenandatangan = (jadwal) => loadPenandatanganProdi(kodeProdiJadwal(jadwal));

module.exports = { getJadwalWithContext, getRealisasiRows, getDaftarHadir, getPenandatangan };
