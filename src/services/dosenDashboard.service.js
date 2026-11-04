const { Op } = require('sequelize');
const {
  Dosen,
  Jurusan,
  RiwayatPendidikanDosen,
  TahunAjaran,
  Mahasiswa,
  Yudisium,
  FeederAkm,
  JadwalKuliah,
  KehadiranDosen,
  AngketPelayananJawaban,
  Krs,
  KrsDetail,
} = require('../models');
const { periodeFromTahunAjaran } = require('./feeder/helpers');
const ApiError = require('../utils/ApiError');
const { formatTahunAjaran } = require('../utils/tahunAjaran');
const { listPengumumanTayang } = require('./pengumuman.service');

/**
 * Dashboard portal dosen: ringkasan & statistik, pengumuman BAAK untuk dosen, dan biodata dosen pada
 * SDM. Dosen boleh mengubah data pribadi & kontaknya (termasuk No Telp & WhatsApp — tampil di
 * Informasi Dosen portal mahasiswa) serta riwayat pendidikan; nama, NIDN, jabatan & KUM tetap dikelola SDM.
 */

const BIODATA_ATTRS = [
  'id',
  'nidn',
  'nuptk',
  'namaLengkap',
  'gelar',
  'tempatLahir',
  'tanggalLahir',
  'jenisKelamin',
  'agama',
  'email',
  'alamat',
  'telpHp',
  'noWhatsapp',
  'pendidikanAkhir',
  'jabatanFungsional',
  'kum',
  'statusDosen',
  'jenisDosen',
  'jurusanId',
];

const getBiodata = async (dosenId) => {
  const dosen = await Dosen.findByPk(dosenId, {
    attributes: BIODATA_ATTRS,
    include: [
      { model: Jurusan, as: 'jurusan', attributes: ['id', 'namaJurusan'], required: false },
      { model: RiwayatPendidikanDosen, as: 'riwayatPendidikan', required: false },
    ],
    order: [[{ model: RiwayatPendidikanDosen, as: 'riwayatPendidikan' }, 'tahunLulus', 'ASC']],
  });
  if (!dosen) throw new ApiError(404, 'Dosen tidak ditemukan');
  return dosen;
};

const persen = (n, total) => (total ? Math.round((n / total) * 10000) / 100 : 0);
const TARGET_PERTEMUAN = 16;
const STATUS_KOSONG = () => ({ jumlah: 0, aktif: 0, cuti: 0, nonAktif: 0, lulus: 0, dikeluarkan: 0, mengundurkanDiri: 0 });

/**
 * Jumlah mahasiswa per prodi menurut status: Lulus = sudah yudisium; Dikeluarkan = DROP_OUT;
 * Mengundurkan Diri = MENGUNDURKAN_DIRI; Cuti = status keluar CUTI atau AKM periode berjalan C;
 * Non-Aktif = AKM N, status keluar lain, akun nonaktif, atau belum isi KRS (tanpa KRS / hanya Draft kosong,
 * sama dengan filter Belum Isi di menu KRS); sisanya Aktif. AKM A/G/M tetap Aktif walau tanpa KRS. Aturan KRS
 * dilewati bila periode belum punya data KRS sama sekali (mis. periode lama) dan untuk angkatan setelah periode tsb.
 */
const statistikProdi = async (tahunAjaran) => {
  const periode = tahunAjaran ? periodeFromTahunAjaran(tahunAjaran) : null;
  const [mahasiswa, lulusList, akmList, krsList] = await Promise.all([
    Mahasiswa.findAll({
      attributes: ['id', 'isActive', 'statusKeluar', 'jurusanId', 'tahunMasuk'],
      include: [{ model: Jurusan, as: 'jurusan', attributes: ['id', 'namaJurusan'], required: false }],
    }),
    Yudisium.findAll({ attributes: ['mahasiswaId'], raw: true }),
    periode ? FeederAkm.findAll({ where: { periode }, attributes: ['mahasiswaId', 'statusMahasiswa'], raw: true }) : [],
    tahunAjaran
      ? Krs.findAll({
          where: { tahunAjaranId: tahunAjaran.id },
          attributes: ['mahasiswaId', 'status'],
          include: [{ model: KrsDetail, as: 'detailList', attributes: ['id'], required: false }],
        })
      : [],
  ]);
  const sudahIsiKrs = new Set(krsList.filter((k) => k.status !== 'DRAFT' || k.detailList.length).map((k) => k.mahasiswaId));
  const belumIsiKrs = (m) => krsList.length > 0 && m.tahunMasuk <= tahunAjaran.tahunMulai && !sudahIsiKrs.has(m.id);
  const lulus = new Set(lulusList.map((y) => y.mahasiswaId));
  const akmBy = new Map(akmList.map((a) => [a.mahasiswaId, a.statusMahasiswa]));
  const perProdi = new Map();
  mahasiswa.forEach((m) => {
    const key = m.jurusan?.namaJurusan ?? 'Tanpa Prodi';
    if (!perProdi.has(key)) perProdi.set(key, { prodi: key, ...STATUS_KOSONG() });
    const r = perProdi.get(key);
    r.jumlah += 1;
    const akm = akmBy.get(m.id);
    if (lulus.has(m.id)) r.lulus += 1;
    else if (m.statusKeluar === 'DROP_OUT') r.dikeluarkan += 1;
    else if (m.statusKeluar === 'MENGUNDURKAN_DIRI') r.mengundurkanDiri += 1;
    else if (m.statusKeluar === 'CUTI' || akm === 'C') r.cuti += 1;
    else if (m.statusKeluar || !m.isActive || akm === 'N') r.nonAktif += 1;
    else if (!['A', 'G', 'M'].includes(akm) && belumIsiKrs(m)) r.nonAktif += 1;
    else r.aktif += 1;
  });
  const prodi = [...perProdi.values()].sort((a, b) => a.prodi.localeCompare(b.prodi));
  const total = prodi.reduce((acc, r) => {
    Object.keys(acc).forEach((k) => {
      acc[k] += r[k];
    });
    return acc;
  }, STATUS_KOSONG());
  return { prodi, total };
};

/** Kehadiran mengajar dosen pada tahun akademik aktif: realisasi HADIR dibanding target 16x per kelas. */
const kehadiranDosen = async (dosenId, tahunAjaran) => {
  if (!tahunAjaran) return { hadir: 0, target: 0, jumlahKelas: 0, persen: 0 };
  const pengampuId = '$dosenPengampu.id$';
  const kelas = await JadwalKuliah.findAll({
    attributes: ['id'],
    where: { tahunAjaranId: tahunAjaran.id, [Op.or]: [{ dosenKordinatorId: dosenId }, { [pengampuId]: dosenId }] },
    include: [{ model: Dosen, as: 'dosenPengampu', attributes: [], through: { attributes: [] }, required: false }],
    subQuery: false,
  });
  const ids = [...new Set(kelas.map((k) => k.id))];
  const hadir = ids.length ? await KehadiranDosen.count({ where: { jadwalKuliahId: ids, dosenId, status: 'HADIR' } }) : 0;
  const target = ids.length * TARGET_PERTEMUAN;
  return { hadir, target, jumlahKelas: ids.length, persen: persen(hadir, target) };
};

/**
 * Indeks kepuasan (skala 0–4 seperti SMART lama). Mahasiswa: rata-rata Angket Pelayanan (skor 1–5,
 * dikonversi ke 0–4). Dosen & pembimbingan belum punya sumber data (EDOM belum aktif) -> null.
 */
const indeksKepuasan = async () => {
  const jawaban = await AngketPelayananJawaban.findAll({ attributes: ['jawaban'] });
  const skor = jawaban.flatMap((j) =>
    Object.values(j.jawaban ?? {})
      .map(Number)
      .filter((v) => v >= 1 && v <= 5)
  );
  const rata = skor.length ? skor.reduce((s, v) => s + v, 0) / skor.length : null;
  return {
    mahasiswa: { indeks: rata === null ? null : Math.round((rata - 1) * 100) / 100, responden: jawaban.length },
    dosen: { indeks: null, responden: 0 },
    pembimbingan: { indeks: null, responden: 0 },
  };
};

/** tahunAjaranId = pilihan Setting Tahun Akademik dosen; kosong/tidak valid → tahun ajaran aktif. */
const getDashboard = async (dosenId, tahunAjaranId = null) => {
  const [biodata, terpilih] = await Promise.all([getBiodata(dosenId), tahunAjaranId ? TahunAjaran.findByPk(tahunAjaranId) : null]);
  const tahunAjaran = terpilih ?? (await TahunAjaran.findOne({ where: { isActive: true } }));
  const [pengumuman, statistik, kehadiran, kepuasan] = await Promise.all([
    listPengumumanTayang('DOSEN', biodata.jurusanId),
    statistikProdi(tahunAjaran),
    kehadiranDosen(dosenId, tahunAjaran),
    indeksKepuasan(),
  ]);
  return {
    tahunAjaran: formatTahunAjaran(tahunAjaran),
    pengumuman,
    biodata,
    ringkasan: {
      mahasiswaAktif: statistik.total.aktif,
      persenAktif: persen(statistik.total.aktif, statistik.total.jumlah),
      kehadiran,
      lulusan: statistik.total.lulus,
      persenLulus: persen(statistik.total.lulus, statistik.total.jumlah),
    },
    kepuasan,
    statistikProdi: statistik,
  };
};

const updateBiodata = async (dosenId, payload) => {
  const dosen = await Dosen.findByPk(dosenId);
  if (!dosen) throw new ApiError(404, 'Dosen tidak ditemukan');
  const data = {};
  ['tempatLahir', 'tanggalLahir', 'jenisKelamin', 'agama', 'email', 'alamat', 'telpHp', 'noWhatsapp', 'pendidikanAkhir'].forEach((k) => {
    if (payload[k] !== undefined) data[k] = payload[k] === '' ? null : payload[k];
  });
  await dosen.update(data);
  return getBiodata(dosenId);
};

const findRiwayatMilik = async (dosenId, id) => {
  const riwayat = await RiwayatPendidikanDosen.findOne({ where: { id, dosenId } });
  if (!riwayat) throw new ApiError(404, 'Riwayat pendidikan tidak ditemukan');
  return riwayat;
};

const bersihkan = (payload) => ({
  perguruanTinggi: payload.perguruanTinggi,
  jenjang: payload.jenjang,
  programStudi: payload.programStudi || null,
  gelar: payload.gelar || null,
  tahunLulus: payload.tahunLulus || null,
  noIjazah: payload.noIjazah || null,
});

const tambahRiwayat = async (dosenId, payload) => {
  await RiwayatPendidikanDosen.create({ dosenId, ...bersihkan(payload) });
  return getBiodata(dosenId);
};

const ubahRiwayat = async (dosenId, id, payload) => {
  const riwayat = await findRiwayatMilik(dosenId, id);
  await riwayat.update(bersihkan(payload));
  return getBiodata(dosenId);
};

const hapusRiwayat = async (dosenId, id) => {
  const riwayat = await findRiwayatMilik(dosenId, id);
  await riwayat.destroy();
  return getBiodata(dosenId);
};

module.exports = { getDashboard, getBiodata, updateBiodata, tambahRiwayat, ubahRiwayat, hapusRiwayat };
