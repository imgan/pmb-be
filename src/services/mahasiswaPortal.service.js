const { Op } = require('sequelize');
const {
  Krs,
  KrsDetail,
  JadwalKuliah,
  Dosen,
  MataKuliah,
  Mahasiswa,
  MahasiswaBiodata,
  NilaiMahasiswa,
  TahunAjaran,
  Kurikulum,
  Jurusan,
  SuratKeterangan,
} = require('../models');
const edomService = require('./edom.service');
const ApiError = require('../utils/ApiError');
const { getCetakData } = require('./suratKeterangan.service');
const { buildSuratPdf, suratPdfFilename } = require('./suratKeteranganPdf.service');
const { getKampus } = require('./kampus.service');
const { padananTahunAjaran } = require('./tahunModul.service');
const { assertSksQuota, getIpSemesterSebelumnya, maxSksForSemester } = require('../utils/sksQuota');
const { assertNoConflict } = require('../utils/krsConflict');
const angketPelayananService = require('./angketPelayanan.service');
const { resolveSemesterMahasiswa, masaStudiNormalForJenjang } = require('../utils/hitungSemester');
const { GRADE_BOBOT } = require('../utils/gradeScale');
const { loadKelompokKode, nilaiDiakuiSet } = require('../utils/ekuivalensiMatkul');
const { BIODATA_LOCKED_FOR_MAHASISWA } = require('../validations/mahasiswaBiodata.validation');
const { kontakMahasiswaDariBiodata } = require('../utils/biodataKontak');

// Semua query di service ini WAJIB discope ke mahasiswaId milik mahasiswa yang sedang login
// (req.mahasiswa.id, diisi oleh mahasiswaAuth.middleware.js) — mahasiswa tidak boleh
// melihat/mengubah data mahasiswa lain, dan itu tidak boleh cuma mengandalkan parameter dari client.

const detailInclude = {
  model: KrsDetail,
  as: 'detailList',
  include: [
    {
      model: JadwalKuliah,
      as: 'kelasKuliah',
      include: [
        { model: Dosen, as: 'dosenKordinator' },
        { model: MataKuliah, as: 'mataKuliah' },
      ],
    },
  ],
};

const withTotalSks = (krs) => {
  const json = krs.toJSON ? krs.toJSON() : krs;
  const totalSks = (json.detailList ?? []).reduce((sum, d) => sum + (d.kelasKuliah?.sks ?? 0), 0);
  return { ...json, totalSks };
};

const getTahunAjaranAktif = async () => TahunAjaran.findOne({ where: { isActive: true } });

/**
 * Semester KRS mahasiswa TIDAK boleh dipilih manual — dihitung otomatis dari periode masuk
 * (tahunMasuk + jenisSemester tahun ajaran saat mahasiswa terdaftar) vs periode tahun ajaran
 * yang sedang aktif sekarang, dibedakan formulanya untuk mahasiswa baru vs transfer
 * berdasarkan statusMasuk. Lihat pmb-be/src/utils/hitungSemester.js untuk rumus lengkapnya.
 */
const getSemesterBerjalan = async (mahasiswaId, tahunAjaran = null) => {
  const [mahasiswa, tahunAjaranAktif] = await Promise.all([
    // required: false wajib eksplisit — tahunAjaranId nullable, tanpa ini Sequelize men-default
    // belongsTo tunggal ini jadi INNER JOIN sehingga mahasiswa tanpa tahunAjaranId hilang dari
    // hasil (lihat catatan yang sama di jadwalKuliah.service.js).
    Mahasiswa.findByPk(mahasiswaId, { include: [{ model: TahunAjaran, as: 'tahunAjaran', required: false }] }),
    tahunAjaran ?? getTahunAjaranAktif(),
  ]);
  if (!mahasiswa) throw new ApiError(404, 'Mahasiswa tidak ditemukan');
  if (!tahunAjaranAktif) throw new ApiError(400, 'Belum ada tahun ajaran aktif');

  const semester = resolveSemesterMahasiswa(mahasiswa, tahunAjaranAktif);

  return { semester, statusMasuk: mahasiswa.statusMasuk, tahunAjaranAktif };
};

/**
 * Periode pengisian KRS = tahun akademik padanan Tahun FRS aktif (Modul Admin › Tahun › FRS), lepas dari tahun akademik
 * aktif yang dipakai kehadiran, nilai & jadwal. Belum ada padanan → tahun akademik aktif.
 */
const getPeriodeKrs = async (mahasiswaId) => {
  const tahunAjaran = await padananTahunAjaran('frs');
  const { semester, statusMasuk } = await getSemesterBerjalan(mahasiswaId, tahunAjaran);
  return { tahunAjaran, semester, statusMasuk };
};

const assertPeriodeKrs = (tahunAjaranId, periode) => {
  if (Number(tahunAjaranId) !== periode.tahunAjaran?.id) {
    throw new ApiError(400, `Pengisian KRS saat ini hanya untuk periode ${periode.tahunAjaran?.nama ?? '-'} ${periode.tahunAjaran?.jenisSemester ?? ''}`.trim());
  }
};

// Nilai di bawah C dianggap perlu diulang: kelas mata kuliahnya (atau mata kuliah pengganti di
// kurikulum baru, via Master Konversi Kurikulum) tetap ditawarkan walau semesternya berbeda.
const BATAS_BOBOT_MENGULANG = GRADE_BOBOT.C;

const { kodeProdiJadwal } = require('../utils/prodiJadwal');

/**
 * Jadwal yang boleh diambil mahasiswa di KRS: hanya kelas dari prodi mahasiswa itu sendiri dan
 * semester berjalannya (dihitung di server, bukan dari parameter client). Pengecualian: mata
 * kuliah yang perlu diulang (nilai di bawah C) tetap ditawarkan walau semesternya berbeda.
 */
const listJadwalTersedia = async (query, mahasiswaId) => {
  const where = { isActive: true };
  if (query.tahunAjaranId) where.tahunAjaranId = query.tahunAjaranId;

  let kodeProdiMahasiswa = null;
  let semesterBerjalan = query.semester ? Number(query.semester) : null;
  if (mahasiswaId) {
    const [mahasiswa, berjalan] = await Promise.all([
      Mahasiswa.findByPk(mahasiswaId, { include: [{ model: Jurusan, as: 'jurusan', required: false }] }),
      query.tahunAjaranId ? TahunAjaran.findByPk(query.tahunAjaranId).then((ta) => getSemesterBerjalan(mahasiswaId, ta)) : getSemesterBerjalan(mahasiswaId),
    ]);
    kodeProdiMahasiswa = mahasiswa?.jurusan?.kodeProdi ?? null;
    semesterBerjalan = berjalan.semester;
  }

  const [jadwalList, nilaiList, kelompokOf] = await Promise.all([
    JadwalKuliah.findAll({
      where,
      include: [
        { model: Dosen, as: 'dosenKordinator', required: false },
        {
          model: MataKuliah,
          as: 'mataKuliah',
          required: false,
          include: [
            {
              model: Kurikulum,
              as: 'kurikulum',
              attributes: ['id', 'jurusanId'],
              required: false,
              include: [{ model: Jurusan, as: 'jurusan', attributes: ['id', 'kodeProdi'], required: false }],
            },
          ],
        },
      ],
      order: [['namaMataKuliah', 'ASC']],
    }),
    mahasiswaId
      ? NilaiMahasiswa.findAll({
          where: { mahasiswaId },
          attributes: ['mahasiswaId', 'kodeMataKuliah', 'namaMataKuliah', 'semester', 'grade'],
          raw: true,
        })
      : [],
    loadKelompokKode(),
  ]);

  // Nilai yang diakui per kelompok ekuivalensi = nilai yang akan "diperbaiki" kalau diulang.
  const nilaiSebelumnya = new Map(
    [...nilaiDiakuiSet(nilaiList, kelompokOf)].map((n) => [kelompokOf(n.kodeMataKuliah), n])
  );

  return jadwalList
    .map((j) => {
      const prev = nilaiSebelumnya.get(kelompokOf(j.kodeMataKuliah)) ?? null;
      return {
        ...j.toJSON(),
        mengulang: prev
          ? {
              kodeMataKuliah: prev.kodeMataKuliah,
              namaMataKuliah: prev.namaMataKuliah,
              grade: prev.grade,
              semester: prev.semester,
              bedaKurikulum: prev.kodeMataKuliah !== j.kodeMataKuliah,
            }
          : null,
      };
    })
    .filter((j) => {
      // Hanya prodi mahasiswa sendiri (kalau prodi mahasiswa/jadwal tidak diketahui, tidak ditawarkan).
      if (mahasiswaId && (!kodeProdiMahasiswa || kodeProdiJadwal(j) !== kodeProdiMahasiswa)) return false;
      // Semua semester prodi ditawarkan (mis. mahasiswa semester 9 mengambil MK semester 3 yang
      // tertinggal), kecuali MK yang sudah lulus dengan nilai di atas batas mengulang.
      return !j.mengulang || (GRADE_BOBOT[j.mengulang.grade] ?? 0) < BATAS_BOBOT_MENGULANG;
    })
    // Semester berjalan dulu, lalu semester lain berurutan; jadwal tanpa semester di akhir.
    .sort((a, b) => {
      const rank = (j) => (j.semester == null ? 99 : j.semester === semesterBerjalan ? 0 : j.semester);
      return rank(a) - rank(b) || a.namaMataKuliah.localeCompare(b.namaMataKuliah);
    })
    .map(({ kurikulum, ...j }) => j);
};

const getKuotaSks = async (mahasiswaId, semester) => {
  const ip = await getIpSemesterSebelumnya(mahasiswaId, semester);
  return { ipSemesterSebelumnya: ip, maxSks: maxSksForSemester(semester) };
};

const listKrs = async (mahasiswaId, query) => {
  const where = { mahasiswaId };
  if (query.tahunAjaranId) where.tahunAjaranId = query.tahunAjaranId;
  if (query.semester) where.semester = query.semester;

  const rows = await Krs.findAll({
    where,
    include: [{ model: TahunAjaran, as: 'tahunAjaran' }, detailInclude],
    order: [['id', 'DESC']],
  });
  return rows.map(withTotalSks);
};

const getKrsOwned = async (mahasiswaId, id) => {
  const krs = await Krs.findOne({
    where: { id, mahasiswaId },
    include: [{ model: TahunAjaran, as: 'tahunAjaran' }, detailInclude],
  });
  if (!krs) throw new ApiError(404, 'KRS tidak ditemukan');
  return krs;
};

const saveKrsDraft = async (mahasiswaId, payload) => {
  const { tahunAjaranId, jadwalKuliahIds = [] } = payload;
  // Semester TIDAK diambil dari client — dihitung otomatis supaya tidak bisa dipilih manual.
  const periode = await getPeriodeKrs(mahasiswaId);
  assertPeriodeKrs(tahunAjaranId, periode);
  const { semester } = periode;

  // KRS baru bisa diisi setelah angket pelayanan tahun ajaran ini diisi.
  await angketPelayananService.assertSudahMengisi(mahasiswaId, tahunAjaranId);
  await assertNoConflict(jadwalKuliahIds, mahasiswaId);
  // Hanya jadwal yang memang ditawarkan ke mahasiswa ini (prodi & semester berjalan / mengulang).
  if (jadwalKuliahIds.length) {
    const tersedia = new Set((await listJadwalTersedia({ tahunAjaranId }, mahasiswaId)).map((j) => j.id));
    const ditolak = jadwalKuliahIds.filter((id) => !tersedia.has(Number(id)));
    if (ditolak.length) {
      throw new ApiError(400, 'Sebagian mata kuliah bukan untuk prodi/semester Anda dan tidak bisa diambil');
    }
  }

  // Satu mahasiswa = satu KRS per periode, apa pun semester yang tercatat di KRS tsb.
  let krs = await Krs.findOne({ where: { mahasiswaId, tahunAjaranId } });
  // KRS yang ditolak (dosen PA / BAAK) boleh diperbaiki lagi: disimpan kembali sebagai DRAFT.
  if (krs && !['DRAFT', 'DITOLAK'].includes(krs.status)) {
    throw new ApiError(400, 'KRS untuk semester ini sudah diajukan dan tidak dapat diubah');
  }
  if (krs?.status === 'DITOLAK') await krs.update({ status: 'DRAFT' });
  if (krs && semester > krs.semester) await krs.update({ semester });
  if (!krs) {
    krs = await Krs.create({ mahasiswaId, tahunAjaranId, semester, status: 'DRAFT' });
  }

  await KrsDetail.destroy({ where: { krsId: krs.id } });
  if (jadwalKuliahIds.length) {
    await KrsDetail.bulkCreate(jadwalKuliahIds.map((jadwalKuliahId) => ({ krsId: krs.id, jadwalKuliahId })));
  }

  return getKrsOwned(mahasiswaId, krs.id);
};

const ajukanKrs = async (mahasiswaId, id) => {
  const krs = await Krs.findOne({ where: { id, mahasiswaId } });
  if (!krs) throw new ApiError(404, 'KRS tidak ditemukan');
  if (krs.status !== 'DRAFT') throw new ApiError(400, 'KRS ini sudah diajukan sebelumnya');
  assertPeriodeKrs(krs.tahunAjaranId, await getPeriodeKrs(mahasiswaId));

  const details = await KrsDetail.findAll({ where: { krsId: krs.id } });
  if (!details.length) throw new ApiError(400, 'Pilih minimal satu mata kuliah sebelum mengajukan KRS');

  await angketPelayananService.assertSudahMengisi(mahasiswaId, krs.tahunAjaranId);
  await assertSksQuota(mahasiswaId, krs.semester, details.map((d) => d.jadwalKuliahId));

  await krs.update({ status: 'DIAJUKAN' });
  return getKrsOwned(mahasiswaId, krs.id);
};

const listNilai = async (mahasiswaId, query) => {
  // Seluruh nilai dimuat (bukan cuma semester yang difilter) supaya flag `diakui` benar: nilai
  // mata kuliah yang sudah diulang — termasuk lewat konversi kurikulum — ditandai tidak diakui.
  // Nilai semester berjalan disembunyikan sampai angket dosen kelas tsb diisi (perluIsiAngket).
  const [semuaNilai, kelompokOf, angket] = await Promise.all([
    NilaiMahasiswa.findAll({
      where: { mahasiswaId },
      order: [['semester', 'ASC'], ['kodeMataKuliah', 'ASC']],
    }),
    loadKelompokKode(),
    edomService.statusAngketNilai(mahasiswaId),
  ]);
  const diakuiSet = nilaiDiakuiSet(semuaNilai, kelompokOf);
  const terkunci = (n) => {
    const a = angket.get(n.kodeMataKuliah);
    return a && a.semester === n.semester && a.belum > 0 ? a : null;
  };
  const nilaiList = query.semester ? semuaNilai.filter((n) => n.semester === Number(query.semester)) : semuaNilai;

  const bySemester = new Map();
  nilaiList.forEach((n) => {
    const kunci = terkunci(n);
    const bobot = kunci ? 0 : GRADE_BOBOT[n.grade] ?? 0;
    const mutu = Math.round(bobot * n.sks * 100) / 100;
    const entry = {
      kodeMataKuliah: n.kodeMataKuliah,
      namaMataKuliah: n.namaMataKuliah,
      sks: n.sks,
      nilai: kunci ? null : n.nilai,
      grade: kunci ? null : n.grade,
      bobot,
      mutu,
      // Nilai yang masih terkunci tidak ikut dihitung (IP/IPK) sampai angket diisi.
      diakui: !kunci && diakuiSet.has(n),
      perluIsiAngket: !!kunci,
      jadwalKuliahId: kunci?.jadwalKuliahId ?? null,
    };
    const list = bySemester.get(n.semester) ?? [];
    list.push(entry);
    bySemester.set(n.semester, list);
  });

  return [...bySemester.entries()].map(([semester, nilai]) => {
    const dihitung = nilai.filter((n) => !n.perluIsiAngket);
    const totalSks = dihitung.reduce((sum, n) => sum + n.sks, 0);
    const totalMutu = dihitung.reduce((sum, n) => sum + n.mutu, 0);
    const ipSemester = totalSks > 0 ? Math.round((totalMutu / totalSks) * 100) / 100 : 0;
    // terkunciEdom: cetak KHS semester ini ditolak sampai semua angket dosennya diisi.
    return { semester, nilai, totalSks, totalMutu, ipSemester, terkunciEdom: nilai.some((n) => n.perluIsiAngket) };
  });
};

const getTranskrip = async (mahasiswaId) => {
  const perSemester = await listNilai(mahasiswaId, {});
  // IPS per semester tetap memakai semua nilai semester tsb; IPK hanya nilai yang diakui.
  const diakui = perSemester.flatMap((s) => s.nilai).filter((n) => n.diakui);
  const totalSks = diakui.reduce((sum, n) => sum + n.sks, 0);
  const totalMutu = diakui.reduce((sum, n) => sum + n.mutu, 0);
  const ipk = totalSks > 0 ? Math.round((totalMutu / totalSks) * 100) / 100 : 0;
  return { perSemester, totalSks, ipk };
};

const listSuratKeterangan = async (mahasiswaId) =>
  SuratKeterangan.findAll({ where: { mahasiswaId }, order: [['id', 'DESC']] });

const createSuratKeterangan = async (mahasiswaId, payload) =>
  SuratKeterangan.create({
    ...payload,
    mahasiswaId,
    tanggalInput: new Date(),
    status: 'DIAJUKAN',
  });

const getSuratKeteranganPdf = async (mahasiswaId, id) => {
  const surat = await SuratKeterangan.findOne({ where: { id, mahasiswaId } });
  if (!surat) throw new ApiError(404, 'Pengajuan surat tidak ditemukan');
  if (surat.status !== 'DISETUJUI') {
    throw new ApiError(400, 'Surat belum disetujui BAAK dan belum bisa dicetak');
  }

  const [data, kampus] = await Promise.all([getCetakData(id), getKampus()]);
  return { doc: buildSuratPdf(data, kampus), filename: suratPdfFilename(data) };
};

// Data pembiayaan (jenis pembiayaan, biaya masuk) tidak dikirim ke portal mahasiswa.
const getBiodataSendiri = async (mahasiswaId) =>
  MahasiswaBiodata.findOne({ where: { mahasiswaId }, attributes: { exclude: ['jenisPembiayaan', 'biayaMasuk'] } });

/**
 * Data Kartu Tanda Mahasiswa (KTM) milik mahasiswa yang login — dipakai untuk pratinjau di
 * portal & cetak PDF. Hanya mahasiswa aktif (belum keluar/lulus/DO) yang boleh mencetak.
 * Masa berlaku = akhir masa studi normal (D3 6 semester, D4 8 semester) dihitung dari tahun
 * masuk, berakhir 31 Agustus (akhir tahun ajaran genap).
 */
const getKtmData = async (mahasiswaId) => {
  const [mahasiswa, kampus] = await Promise.all([
    Mahasiswa.scope(['defaultScope', 'withPhoto']).findByPk(mahasiswaId, {
      include: [
        { association: 'jurusan' },
        { association: 'golonganKelas' },
        { model: MahasiswaBiodata, as: 'biodata', required: false },
      ],
    }),
    getKampus(),
  ]);
  if (!mahasiswa) throw new ApiError(404, 'Mahasiswa tidak ditemukan');
  if (!mahasiswa.isActive || mahasiswa.statusKeluar) {
    throw new ApiError(403, 'KTM hanya dapat dicetak oleh mahasiswa dengan status aktif');
  }

  const jenjang = mahasiswa.jurusan?.jenjangPendidikan ?? null;
  const tahunBerakhir = mahasiswa.tahunMasuk + masaStudiNormalForJenjang(jenjang) / 2;

  return {
    nim: mahasiswa.nim,
    namaLengkap: mahasiswa.namaLengkap,
    programStudi: mahasiswa.jurusan?.namaJurusan ?? null,
    jenjangPendidikan: jenjang,
    kelas: mahasiswa.golonganKelas?.namaKelas ?? null,
    tempatLahir: mahasiswa.biodata?.tempatLahir ?? null,
    tanggalLahir: mahasiswa.biodata?.tanggalLahir ?? null,
    jenisKelamin: mahasiswa.biodata?.jenisKelamin ?? null,
    alamat: mahasiswa.alamat ?? mahasiswa.biodata?.jalan ?? null,
    tahunMasuk: mahasiswa.tahunMasuk,
    berlakuHingga: `${tahunBerakhir}-08-31`,
    photo: mahasiswa.photo ?? null,
    kampus: kampus
      ? {
          namaKampus: kampus.namaKampus,
          alamat: kampus.alamat,
          telepon: kampus.telepon,
          email: kampus.email,
          logoUrl: kampus.logoUrl,
        }
      : null,
  };
};

// Edit biodata mandiri oleh mahasiswa. Field terkunci (kelas, data pendaftaran, prodi, status)
// sudah di-strip di validasi; dibuang lagi di sini supaya service tidak bergantung pada route.
const saveBiodataSendiri = async (mahasiswaId, payload) => {
  const data = { ...payload };
  BIODATA_LOCKED_FOR_MAHASISWA.forEach((key) => delete data[key]);

  const biodata = await MahasiswaBiodata.findOne({ where: { mahasiswaId } });
  if (biodata) {
    await biodata.update(data);
  } else {
    // Biodata baru: program studi diisi dari jurusan mahasiswa (bukan dari input mahasiswa).
    const mahasiswa = await Mahasiswa.findByPk(mahasiswaId, { include: [{ association: 'jurusan' }] });
    if (!mahasiswa) throw new ApiError(404, 'Mahasiswa not found');
    await MahasiswaBiodata.create({ ...data, mahasiswaId, programStudi: mahasiswa.jurusan?.namaJurusan ?? null });
  }
  const kontak = kontakMahasiswaDariBiodata(data);
  if (Object.keys(kontak).length) await Mahasiswa.update(kontak, { where: { id: mahasiswaId } });
  return getBiodataSendiri(mahasiswaId);
};

/**
 * Mata kuliah yang belum selesai / harus diulang: nilai yang diakui (terbaik per MK, termasuk
 * ekuivalensi konversi kurikulum) masih di bawah C — aturan yang sama dengan penawaran kelas
 * mengulang di KRS. `sedangDiulang` = MK tsb sudah ada di KRS tahun ajaran aktif.
 */
const getMatakuliahMengulang = async (mahasiswaId) => {
  const [nilaiList, kelompokOf, tahunAjaranAktif] = await Promise.all([
    NilaiMahasiswa.findAll({
      where: { mahasiswaId },
      attributes: ['mahasiswaId', 'kodeMataKuliah', 'namaMataKuliah', 'sks', 'semester', 'nilai', 'grade'],
      raw: true,
    }),
    loadKelompokKode(),
    getTahunAjaranAktif(),
  ]);
  const belumLulus = [...nilaiDiakuiSet(nilaiList, kelompokOf)].filter((n) => (GRADE_BOBOT[n.grade] ?? 0) < BATAS_BOBOT_MENGULANG);
  if (!belumLulus.length) return [];

  const krsAktif = tahunAjaranAktif
    ? await KrsDetail.findAll({
        include: [
          { model: Krs, as: 'krs', required: true, attributes: [], where: { mahasiswaId, tahunAjaranId: tahunAjaranAktif.id, status: { [Op.ne]: 'DITOLAK' } } },
          { model: JadwalKuliah, as: 'kelasKuliah', required: true, attributes: ['kodeMataKuliah'] },
        ],
      })
    : [];
  const diulang = new Set(krsAktif.map((d) => kelompokOf(d.kelasKuliah.kodeMataKuliah)));

  return belumLulus
    .map((n) => ({
      kodeMataKuliah: n.kodeMataKuliah,
      namaMataKuliah: n.namaMataKuliah,
      sks: n.sks,
      semester: n.semester,
      nilai: n.nilai === null ? null : Number(n.nilai),
      grade: n.grade,
      sedangDiulang: diulang.has(kelompokOf(n.kodeMataKuliah)),
    }))
    .sort((a, b) => a.semester - b.semester || a.kodeMataKuliah.localeCompare(b.kodeMataKuliah));
};

module.exports = {
  getMatakuliahMengulang,
  getTahunAjaranAktif,
  getSemesterBerjalan,
  getPeriodeKrs,
  listJadwalTersedia,
  getKuotaSks,
  listKrs,
  getKrsOwned,
  saveKrsDraft,
  ajukanKrs,
  listNilai,
  getTranskrip,
  listSuratKeterangan,
  createSuratKeterangan,
  getSuratKeteranganPdf,
  getBiodataSendiri,
  saveBiodataSendiri,
  getKtmData,
};
