const { NilaiMagang, PembimbingMagang, Dosen, Mahasiswa, Jurusan, TahunAjaran } = require('../models');
const ApiError = require('../utils/ApiError');
const { formatTahunAjaran } = require('../utils/tahunAjaran');
const { resolveSemesterMahasiswa } = require('../utils/hitungSemester');

/**
 * Pendaftaran Kuliah Kerja Praktek (KKP) dari portal mahasiswa (Pengajuan → Kuliah Kerja Praktek).
 * Disimpan ke nilai_magang — data yang sama dikelola prodi di menu Nilai Magang (prodi mengisi
 * tanggal, pembimbing lapangan & nilai). Satu pendaftaran per mahasiswa per tahun ajaran aktif;
 * mahasiswa masih bisa mengubahnya selama nilai belum diisi prodi.
 */

const getTahunAjaranAktif = async () => {
  const ta = await TahunAjaran.findOne({ where: { isActive: true } });
  if (!ta) throw new ApiError(400, 'Belum ada tahun ajaran aktif');
  return ta;
};

const toPendaftaran = (item) =>
  item && {
    id: item.id,
    semester: item.semester,
    judul: item.judul,
    perusahaan: item.lokasi,
    alamat: item.alamatLokasi,
    email: item.emailPerusahaan,
    telepon: item.teleponPerusahaan,
    pembimbingMagangId: item.pembimbingMagangId,
    pembimbing: item.pembimbingMagang?.dosen?.namaLengkap ?? null,
    pembimbingLapangan: item.pembimbingLapangan,
    tanggalMulai: item.tanggalMulai,
    tanggalSelesai: item.tanggalSelesai,
    nilai: item.nilai,
    grade: item.grade,
    bisaDiubah: item.nilai === null,
    updatedAt: item.updatedAt,
  };

const findPendaftaran = (mahasiswaId, tahunAjaranId) =>
  NilaiMagang.findOne({
    where: { mahasiswaId, tahunAjaranId },
    include: [
      {
        model: PembimbingMagang,
        as: 'pembimbingMagang',
        required: false,
        include: [{ model: Dosen, as: 'dosen', attributes: ['id', 'namaLengkap'], required: false }],
      },
    ],
  });

/** Data form: identitas mahasiswa, tahun ajaran aktif, pilihan pembimbing & pendaftaran yang sudah ada. */
const getFormKkp = async (mahasiswaId) => {
  const [mahasiswa, tahunAjaran, pembimbingList] = await Promise.all([
    Mahasiswa.findByPk(mahasiswaId, {
      attributes: ['id', 'nim', 'namaLengkap', 'tahunMasuk', 'statusMasuk', 'semesterDiakui', 'jumlahSemesterCuti', 'semesterOverride'],
      include: [
        { model: Jurusan, as: 'jurusan', attributes: ['namaJurusan'], required: false },
        { model: TahunAjaran, as: 'tahunAjaran', attributes: ['jenisSemester'], required: false },
      ],
    }),
    getTahunAjaranAktif(),
    PembimbingMagang.findAll({
      include: [{ model: Dosen, as: 'dosen', attributes: ['id', 'namaLengkap'], required: true }],
      order: [[{ model: Dosen, as: 'dosen' }, 'namaLengkap', 'ASC']],
    }),
  ]);
  if (!mahasiswa) throw new ApiError(404, 'Mahasiswa tidak ditemukan');

  return {
    mahasiswa: { nim: mahasiswa.nim, namaLengkap: mahasiswa.namaLengkap, prodi: mahasiswa.jurusan?.namaJurusan ?? '-' },
    tahunAjaran: { id: tahunAjaran.id, label: formatTahunAjaran(tahunAjaran) },
    semesterBerjalan: resolveSemesterMahasiswa(mahasiswa, tahunAjaran),
    pembimbingOptions: pembimbingList.map((p) => ({ value: p.id, label: p.dosen.namaLengkap })),
    pendaftaran: toPendaftaran(await findPendaftaran(mahasiswaId, tahunAjaran.id)),
  };
};

/** Simpan (daftar baru / ubah) pendaftaran KKP tahun ajaran aktif. */
const saveKkp = async (mahasiswaId, payload) => {
  const tahunAjaran = await getTahunAjaranAktif();
  if (payload.pembimbingMagangId && !(await PembimbingMagang.findByPk(payload.pembimbingMagangId))) {
    throw new ApiError(400, 'Pembimbing tidak ditemukan');
  }
  const data = {
    semester: payload.semester,
    judul: payload.judul,
    lokasi: payload.perusahaan,
    alamatLokasi: payload.alamat || null,
    emailPerusahaan: payload.email || null,
    teleponPerusahaan: payload.telepon || null,
    pembimbingMagangId: payload.pembimbingMagangId || null,
  };

  const existing = await findPendaftaran(mahasiswaId, tahunAjaran.id);
  if (existing) {
    if (existing.nilai !== null) throw new ApiError(400, 'Nilai KKP sudah diisi prodi, pendaftaran tidak dapat diubah lagi');
    await existing.update(data);
  } else {
    await NilaiMagang.create({ ...data, mahasiswaId, tahunAjaranId: tahunAjaran.id });
  }
  return toPendaftaran(await findPendaftaran(mahasiswaId, tahunAjaran.id));
};

module.exports = { getFormKkp, saveKkp };
