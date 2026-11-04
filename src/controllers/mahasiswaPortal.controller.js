const catchAsync = require('../utils/catchAsync');
const pembayaranWisudaService = require('../services/pembayaranWisuda.service');
const pembayaranTaSkripsiService = require('../services/pembayaranTaSkripsi.service');
const sendResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const service = require('../services/mahasiswaPortal.service');
const pengumumanService = require('../services/pengumuman.service');
const dataKampusService = require('../services/mahasiswaDataKampus.service');
const laporanKhsService = require('../services/laporanKhs.service');
const { buildLaporanKhsPdf } = require('../services/laporanKhsPdf.service');
const { buildKtmPdf } = require('../services/ktmPdf.service');
const kampusService = require('../services/kampus.service');
const batasTagihanService = require('../services/batasTagihanAkademik.service');
const presensiService = require('../services/mahasiswaPresensi.service');
const edomService = require('../services/edom.service');
const kalenderAkademikService = require('../services/kalenderAkademik.service');
const pembayaranService = require('../services/mahasiswaPembayaran.service');
const { buildKwitansiPembayaranPdf } = require('../services/kwitansiPembayaranPdf.service');

// Status batas tagihan (KRS & nilai) untuk mahasiswa login — ditampilkan sebagai peringatan di halaman KRS/Nilai.
const aksesAkademik = catchAsync(async (req, res) => {
  const data = await batasTagihanService.getAksesMahasiswa(req.mahasiswa);
  sendResponse(res, 200, { message: 'Akses akademik fetched', data });
});

const tahunAjaranAktif = catchAsync(async (req, res) => {
  const data = await service.getTahunAjaranAktif();
  sendResponse(res, 200, { message: 'Tahun ajaran aktif fetched', data });
});

const listJadwalTersedia = catchAsync(async (req, res) => {
  const data = await service.listJadwalTersedia(req.query, req.mahasiswa.id);
  sendResponse(res, 200, { message: 'Jadwal tersedia fetched', data });
});

const semesterBerjalan = catchAsync(async (req, res) => {
  const data = await service.getSemesterBerjalan(req.mahasiswa.id);
  sendResponse(res, 200, { message: 'Semester berjalan fetched', data });
});

const periodeKrs = catchAsync(async (req, res) => {
  sendResponse(res, 200, { message: 'Periode KRS fetched', data: await service.getPeriodeKrs(req.mahasiswa.id) });
});

const kuotaSks = catchAsync(async (req, res) => {
  const data = await service.getKuotaSks(req.mahasiswa.id, req.query.semester);
  sendResponse(res, 200, { message: 'Kuota SKS fetched', data });
});

const listKrs = catchAsync(async (req, res) => {
  const data = await service.listKrs(req.mahasiswa.id, req.query);
  sendResponse(res, 200, { message: 'KRS fetched', data });
});

const saveKrsDraft = catchAsync(async (req, res) => {
  await batasTagihanService.assertAksesMahasiswa(req.mahasiswa, 'krs');
  const data = await service.saveKrsDraft(req.mahasiswa.id, req.body);
  sendResponse(res, 200, { message: 'KRS draft berhasil disimpan', data });
});

const ajukanKrs = catchAsync(async (req, res) => {
  await batasTagihanService.assertAksesMahasiswa(req.mahasiswa, 'krs');
  const data = await service.ajukanKrs(req.mahasiswa.id, req.params.id);
  sendResponse(res, 200, { message: 'KRS berhasil diajukan', data });
});

const listNilai = catchAsync(async (req, res) => {
  await batasTagihanService.assertAksesMahasiswa(req.mahasiswa, 'nilai');
  const data = await service.listNilai(req.mahasiswa.id, req.query);
  sendResponse(res, 200, { message: 'Nilai (KHS) fetched', data });
});

// Cetak KHS milik mahasiswa yang login — reuse generator PDF yang sama dengan Laporan Cetak KHS (BAAK),
// tapi tanpa kop surat (KHS dari modul mahasiswa tidak mencantumkan kop).
const khsPdf = catchAsync(async (req, res) => {
  const { semester } = req.query;
  if (!semester) throw new ApiError(400, 'Semester wajib dipilih');
  await batasTagihanService.assertAksesMahasiswa(req.mahasiswa, 'nilai');
  if (semester === 'semua') {
    // Semua semester: lewati semester yang masih terkunci EDOM.
    const terkunci = new Set((await service.listNilai(req.mahasiswa.id, {})).filter((k) => k.terkunciEdom).map((k) => Number(k.semester)));
    const [list, kampusSemua] = await Promise.all([laporanKhsService.getKhsSemuaSemester(req.mahasiswa.id), kampusService.getKampus()]);
    const data = list.filter((d) => !terkunci.has(Number(d.semester)));
    if (!data.length) throw new ApiError(404, 'Belum ada nilai yang bisa dicetak');
    const docSemua = buildLaporanKhsPdf(data, kampusSemua, { withKop: false });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="khs-${data[0].mahasiswa.nim}-semua-semester.pdf"`);
    docSemua.pipe(res);
    return;
  }
  const [khsSemester] = await service.listNilai(req.mahasiswa.id, { semester });
  if (khsSemester?.terkunciEdom) {
    throw new ApiError(403, 'Isi angket dosen seluruh mata kuliah semester ini terlebih dahulu (Akademik → Angket Dosen) sebelum mencetak KHS');
  }

  const [data, kampus] = await Promise.all([
    laporanKhsService.getKhsData(req.mahasiswa.id, semester),
    kampusService.getKampus(),
  ]);
  if (!data.nilai.length) throw new ApiError(404, 'Belum ada nilai pada semester ini');

  const doc = buildLaporanKhsPdf(data, kampus, { withKop: false });
  const filename = `khs-${data.mahasiswa.nim}-semester-${semester}.pdf`;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
  doc.pipe(res);
});

const getKurikulum = catchAsync(async (req, res) => {
  const data = await dataKampusService.getKurikulum(req.mahasiswa.id, req.query);
  sendResponse(res, 200, { message: 'Kurikulum fetched', data });
});

const getRekapKehadiran = catchAsync(async (req, res) => {
  const data = await dataKampusService.getRekapKehadiran(req.mahasiswa.id, req.query);
  sendResponse(res, 200, { message: 'Rekap kehadiran fetched', data });
});

const getDaftarDosen = catchAsync(async (req, res) => {
  const data = await dataKampusService.getDaftarDosen();
  sendResponse(res, 200, { message: 'Daftar dosen fetched', data });
});

const listPengumuman = catchAsync(async (req, res) => {
  const data = await pengumumanService.listPengumumanMahasiswa(req.mahasiswa.id);
  sendResponse(res, 200, { message: 'Pengumuman fetched', data });
});

const getMatakuliahMengulang = catchAsync(async (req, res) => {
  await batasTagihanService.assertAksesMahasiswa(req.mahasiswa, 'nilai');
  const data = await service.getMatakuliahMengulang(req.mahasiswa.id);
  sendResponse(res, 200, { message: 'Mata kuliah mengulang fetched', data });
});

const getTranskrip = catchAsync(async (req, res) => {
  await batasTagihanService.assertAksesMahasiswa(req.mahasiswa, 'nilai');
  const data = await service.getTranskrip(req.mahasiswa.id);
  sendResponse(res, 200, { message: 'Transkrip fetched', data });
});

// Angket dosen (EDOM): pertanyaan & pilihan jawaban dari master Prodi → Pertanyaan Angket Dosen.
const listEdomPertanyaan = catchAsync(async (req, res) => {
  const { pertanyaan, pilihanJawaban } = await edomService.getAngketMahasiswa(req.mahasiswa.id);
  sendResponse(res, 200, { message: 'Pertanyaan angket dosen fetched', data: { pertanyaan, pilihanJawaban } });
});

const getKalenderAkademik = catchAsync(async (req, res) => {
  sendResponse(res, 200, { message: 'Kalender akademik fetched', data: await kalenderAkademikService.untukMahasiswa(req.query) });
});

const getAngketDosen = catchAsync(async (req, res) => {
  sendResponse(res, 200, { message: 'Angket dosen fetched', data: await edomService.getAngketMahasiswa(req.mahasiswa.id) });
});

const submitEdom = catchAsync(async (req, res) => {
  await edomService.submit(req.mahasiswa.id, req.body);
  sendResponse(res, 201, { message: 'Terima kasih, angket dosen tersimpan' });
});

const listSuratKeterangan = catchAsync(async (req, res) => {
  const data = await service.listSuratKeterangan(req.mahasiswa.id);
  sendResponse(res, 200, { message: 'Pengajuan surat fetched', data });
});

const createSuratKeterangan = catchAsync(async (req, res) => {
  const data = await service.createSuratKeterangan(req.mahasiswa.id, req.body);
  sendResponse(res, 201, { message: 'Pengajuan surat berhasil dikirim', data });
});

const suratKeteranganPdf = catchAsync(async (req, res) => {
  const { doc, filename } = await service.getSuratKeteranganPdf(req.mahasiswa.id, req.params.id);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
  doc.pipe(res);
});

const getKtm = catchAsync(async (req, res) => {
  const data = await service.getKtmData(req.mahasiswa.id);
  sendResponse(res, 200, { message: 'Data KTM fetched', data });
});

const ktmPdf = catchAsync(async (req, res) => {
  const data = await service.getKtmData(req.mahasiswa.id);
  const doc = buildKtmPdf(data);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="ktm-${data.nim}.pdf"`);
  doc.pipe(res);
});

// Riwayat pembayaran kuliah per semester (tagihan, dibayar, sisa, daftar pembayaran).
const listPembayaran = catchAsync(async (req, res) => {
  const [data, wisuda, taSkripsi] = await Promise.all([
    pembayaranService.listPembayaranKuliah(req.mahasiswa.id),
    pembayaranWisudaService.tagihanWisudaMahasiswa(req.mahasiswa.id),
    pembayaranTaSkripsiService.tagihanTaMahasiswa(req.mahasiswa.id),
  ]);
  sendResponse(res, 200, { message: 'Riwayat pembayaran fetched', data: { ...data, wisuda, taSkripsi } });
});

const kwitansiPdf = catchAsync(async (req, res) => {
  const [data, kampus] = await Promise.all([
    pembayaranService.getKwitansiData(req.mahasiswa.id, Number(req.params.id)),
    kampusService.getKampus(),
  ]);
  const doc = buildKwitansiPembayaranPdf(data, kampus);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="kwitansi-${data.mahasiswa.nim}-${req.params.id}.pdf"`);
  doc.pipe(res);
});

const getBiodata = catchAsync(async (req, res) => {
  const data = await service.getBiodataSendiri(req.mahasiswa.id);
  sendResponse(res, 200, { message: 'Biodata fetched', data });
});

const saveBiodata = catchAsync(async (req, res) => {
  const data = await service.saveBiodataSendiri(req.mahasiswa.id, req.body);
  sendResponse(res, 200, { message: 'Biodata berhasil disimpan', data });
});

// Detail jadwal: realisasi dosen per pertemuan + presensi mandiri mahasiswa.
const realisasiJadwal = catchAsync(async (req, res) => {
  const data = await presensiService.getRealisasiJadwal(req.mahasiswa.id, Number(req.params.jadwalKuliahId));
  sendResponse(res, 200, { message: 'Realisasi jadwal fetched', data });
});

const presensiMandiri = catchAsync(async (req, res) => {
  const data = await presensiService.presensiMandiri(
    req.mahasiswa.id,
    Number(req.params.jadwalKuliahId),
    Number(req.params.kehadiranDosenId)
  );
  sendResponse(res, 200, { message: 'Presensi tercatat', data });
});

module.exports = {
  getKurikulum,
  getRekapKehadiran,
  getDaftarDosen,
  listPengumuman,
  getMatakuliahMengulang,
  listPembayaran,
  kwitansiPdf,
  getKtm,
  ktmPdf,
  realisasiJadwal,
  presensiMandiri,
  aksesAkademik,
  tahunAjaranAktif,
  listJadwalTersedia,
  semesterBerjalan,
  kuotaSks,
  periodeKrs,
  listKrs,
  saveKrsDraft,
  ajukanKrs,
  listNilai,
  khsPdf,
  getTranskrip,
  listEdomPertanyaan,
  getAngketDosen,
  getKalenderAkademik,
  submitEdom,
  listSuratKeterangan,
  createSuratKeterangan,
  suratKeteranganPdf,
  getBiodata,
  saveBiodata,
};
