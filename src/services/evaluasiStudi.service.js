const { Op } = require('sequelize');
const { Mahasiswa, Jurusan, GolonganKelas, TahunAjaran, NilaiMahasiswa } = require('../models');
const { getPagination, getPagingMeta } = require('../utils/pagination');
const { GRADE_BOBOT } = require('../utils/gradeScale');
const { resolveSemesterMahasiswa, maxSemesterWajarForJenjang, masaStudiNormalForJenjang } = require('../utils/hitungSemester');

/**
 * Evaluasi Studi bertahap sesuai Pedoman Akademik Poltek Bhani Bab II.G — MENANDAI saja
 * mahasiswa yang belum/tidak memenuhi syarat tiap tahap evaluasi untuk ditinjau manual oleh
 * BAAK/Prodi (keputusan status keluar/DO tetap manual, bukan otomatis oleh sistem).
 *
 * - Evaluasi Dua Tahun Pertama (berlaku mulai semester 4): min 36 sks tanpa nilai E, IPK >= 2,00.
 * - Evaluasi Dua Tahun Kedua (berlaku menjelang akhir masa studi normal — D3 semester 6,
 *   D4 semester 8): min 78 sks tanpa nilai D & E, IPK >= 2,50.
 * - Batas Akhir Masa Studi (paling lama — D3 10 semester, D4 14 semester): dihitung ulang di
 *   sini juga (bukan cuma saat aktivasi tahun ajaran) supaya selalu terlihat kondisi terkini.
 */
const EVALUASI_TAHAP_1_SEMESTER = 4;
const EVALUASI_TAHAP_1_MIN_SKS = 36;
const EVALUASI_TAHAP_1_MIN_IPK = 2.0;
const EVALUASI_TAHAP_2_MIN_SKS = 78;
const EVALUASI_TAHAP_2_MIN_IPK = 2.5;

const hitungIpk = (nilaiList) => {
  const totalSks = nilaiList.reduce((sum, n) => sum + n.sks, 0);
  const totalMutu = nilaiList.reduce((sum, n) => sum + (GRADE_BOBOT[n.grade] ?? 0) * n.sks, 0);
  return totalSks > 0 ? Math.round((totalMutu / totalSks) * 100) / 100 : 0;
};

const sksTanpaGrade = (nilaiList, gradesToExclude) =>
  nilaiList.filter((n) => !gradesToExclude.includes(n.grade)).reduce((sum, n) => sum + n.sks, 0);

const listEvaluasiStudi = async (query = {}) => {
  const { page, limit, offset } = getPagination(query);

  const tahunAjaranAktif = await TahunAjaran.findOne({ where: { isActive: true } });
  if (!tahunAjaranAktif) return { data: [], meta: getPagingMeta(0, page, limit) };

  const mahasiswaWhere = { isActive: true, statusKeluar: null };
  if (query.jurusanId) mahasiswaWhere.jurusanId = query.jurusanId;
  if (query.search) {
    mahasiswaWhere[Op.or] = [
      { nim: { [Op.like]: `%${query.search}%` } },
      { namaLengkap: { [Op.like]: `%${query.search}%` } },
    ];
  }

  const mahasiswaList = await Mahasiswa.findAll({
    where: mahasiswaWhere,
    include: [
      { model: Jurusan, as: 'jurusan', required: false },
      { model: GolonganKelas, as: 'golonganKelas', required: false },
      { model: TahunAjaran, as: 'tahunAjaran', required: false },
    ],
    order: [['nim', 'ASC']],
  });
  if (!mahasiswaList.length) return { data: [], meta: getPagingMeta(0, page, limit) };

  const nilaiList = await NilaiMahasiswa.findAll({
    attributes: ['mahasiswaId', 'sks', 'grade'],
    where: { mahasiswaId: mahasiswaList.map((m) => m.id) },
    raw: true,
  });
  const nilaiByMahasiswa = new Map();
  nilaiList.forEach((n) => {
    const list = nilaiByMahasiswa.get(n.mahasiswaId) ?? [];
    list.push(n);
    nilaiByMahasiswa.set(n.mahasiswaId, list);
  });

  const rows = mahasiswaList.map((mhs) => {
    const nilai = nilaiByMahasiswa.get(mhs.id) ?? [];
    const semester = resolveSemesterMahasiswa(mhs, tahunAjaranAktif);
    const jenjang = mhs.jurusan?.jenjangPendidikan ?? null;
    const maxSemesterWajar = maxSemesterWajarForJenjang(jenjang);
    const masaStudiNormal = masaStudiNormalForJenjang(jenjang);

    const ipk = hitungIpk(nilai);
    const sksTanpaE = sksTanpaGrade(nilai, ['E']);
    const sksTanpaDE = sksTanpaGrade(nilai, ['D', 'E']);

    const tahap1Berlaku = semester >= EVALUASI_TAHAP_1_SEMESTER;
    const tahap1Memenuhi = sksTanpaE >= EVALUASI_TAHAP_1_MIN_SKS && ipk >= EVALUASI_TAHAP_1_MIN_IPK;

    const tahap2Berlaku = semester >= masaStudiNormal;
    const tahap2Memenuhi = sksTanpaDE >= EVALUASI_TAHAP_2_MIN_SKS && ipk >= EVALUASI_TAHAP_2_MIN_IPK;

    const melebihiMasaStudi = semester > maxSemesterWajar;

    return {
      mahasiswaId: mhs.id,
      nim: mhs.nim,
      namaLengkap: mhs.namaLengkap,
      prodi: mhs.jurusan?.namaJurusan ?? '-',
      golonganKelas: mhs.golonganKelas?.namaKelas ?? '-',
      semester,
      ipk,
      sksTanpaE,
      sksTanpaDE,
      maxSemesterWajar,
      tahap1: { berlaku: tahap1Berlaku, memenuhi: tahap1Memenuhi, minSks: EVALUASI_TAHAP_1_MIN_SKS, minIpk: EVALUASI_TAHAP_1_MIN_IPK },
      tahap2: { berlaku: tahap2Berlaku, memenuhi: tahap2Memenuhi, minSks: EVALUASI_TAHAP_2_MIN_SKS, minIpk: EVALUASI_TAHAP_2_MIN_IPK },
      melebihiMasaStudi,
      bermasalah: (tahap1Berlaku && !tahap1Memenuhi) || (tahap2Berlaku && !tahap2Memenuhi) || melebihiMasaStudi,
    };
  });

  const filtered = query.hanyaBermasalah === 'false' ? rows : rows.filter((r) => r.bermasalah);
  const sorted = filtered.sort((a, b) => b.semester - a.semester || a.nim.localeCompare(b.nim));

  const paged = sorted.slice(offset, offset + limit);
  return { data: paged, meta: getPagingMeta(sorted.length, page, limit) };
};

module.exports = { listEvaluasiStudi };
