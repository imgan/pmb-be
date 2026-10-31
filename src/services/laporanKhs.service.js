const { Op } = require('sequelize');
const { Mahasiswa, NilaiMahasiswa, GolonganKelas, Jurusan } = require('../models');
const ApiError = require('../utils/ApiError');
const { getPagination, getPagingMeta } = require('../utils/pagination');
const { GRADE_BOBOT } = require('../utils/gradeScale');
const { loadKelompokKode, pilihNilaiEfektif } = require('../utils/ekuivalensiMatkul');

const kelasLabel = (mahasiswa) =>
  [mahasiswa.golonganKelas?.namaKelas, mahasiswa.jurusan?.namaJurusan].filter(Boolean).join(' / ');

const searchMahasiswa = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const where = {};
  const andConditions = [];
  if (query.nim) andConditions.push({ nim: { [Op.like]: `%${query.nim}%` } });
  if (query.nama) andConditions.push({ namaLengkap: { [Op.like]: `%${query.nama}%` } });
  if (query.search) {
    andConditions.push({
      [Op.or]: [
        { nim: { [Op.like]: `%${query.search}%` } },
        { namaLengkap: { [Op.like]: `%${query.search}%` } },
      ],
    });
  }
  if (andConditions.length) where[Op.and] = andConditions;

  const { rows, count } = await Mahasiswa.findAndCountAll({
    where,
    include: [
      { model: GolonganKelas, as: 'golonganKelas' },
      { model: Jurusan, as: 'jurusan' },
    ],
    limit,
    offset,
    order: [['namaLengkap', 'ASC']],
  });

  const mahasiswaIds = rows.map((row) => row.id);
  const semesterRows = mahasiswaIds.length
    ? await NilaiMahasiswa.findAll({
        attributes: ['mahasiswaId', 'semester'],
        where: { mahasiswaId: { [Op.in]: mahasiswaIds } },
        group: ['mahasiswaId', 'semester'],
        order: [['semester', 'ASC']],
        raw: true,
      })
    : [];
  const semesterMap = new Map();
  semesterRows.forEach((row) => {
    const list = semesterMap.get(row.mahasiswaId) ?? [];
    list.push(row.semester);
    semesterMap.set(row.mahasiswaId, list);
  });

  const data = rows.map((m) => ({
    id: m.id,
    nim: m.nim,
    namaLengkap: m.namaLengkap,
    kelas: kelasLabel(m),
    semesterOptions: semesterMap.get(m.id) ?? [],
  }));

  return { data, meta: getPagingMeta(count, page, limit) };
};

/**
 * IPS = indeks prestasi SEMESTER ini saja; IPK = indeks prestasi KUMULATIF dari semester 1
 * s.d. semester ini — dua angka berbeda sesuai format resmi KHS Poltek Bhani. NilaiMahasiswa
 * tidak punya link ke TahunAjaran per baris (cuma nomor semester urut), jadi Tahun Ajaran &
 * Periode diturunkan dari Mahasiswa.tahunMasuk + nomor semester (ganjil = tahun ajaran
 * dimulai September tahun tsb, genap = tahun ajaran yang sama) — konsisten dengan cara sistem
 * menghitung semester berjalan di utils/hitungSemester.js.
 */
const getKhsData = async (mahasiswaId, semester) => {
  const mahasiswa = await Mahasiswa.findByPk(mahasiswaId, {
    include: [
      { model: GolonganKelas, as: 'golonganKelas' },
      { model: Jurusan, as: 'jurusan' },
    ],
  });
  if (!mahasiswa) throw new ApiError(404, 'Mahasiswa not found');

  const semesterNum = Number(semester);

  const [nilaiSemesterList, nilaiKumulatifSemua, kelompokOf] = await Promise.all([
    NilaiMahasiswa.findAll({ where: { mahasiswaId, semester: semesterNum }, order: [['kodeMataKuliah', 'ASC']] }),
    NilaiMahasiswa.findAll({
      where: { mahasiswaId, semester: { [Op.lte]: semesterNum } },
      attributes: ['mahasiswaId', 'kodeMataKuliah', 'semester', 'sks', 'grade'],
      raw: true,
    }),
    loadKelompokKode(),
  ]);
  // IPK: mata kuliah yang diulang (termasuk lewat konversi kurikulum) hanya dihitung sekali.
  const nilaiKumulatifList = pilihNilaiEfektif(nilaiKumulatifSemua, kelompokOf);

  const nilai = nilaiSemesterList.map((n) => {
    const bobot = GRADE_BOBOT[n.grade] ?? 0;
    return {
      kodeMataKuliah: n.kodeMataKuliah,
      namaMataKuliah: n.namaMataKuliah,
      sks: n.sks,
      nilaiAngka: n.nilai,
      grade: n.grade,
      bobot,
      mutu: Math.round(bobot * n.sks * 100) / 100,
    };
  });

  const totalSks = nilai.reduce((sum, n) => sum + n.sks, 0);
  const totalMutu = nilai.reduce((sum, n) => sum + n.mutu, 0);
  const ips = totalSks > 0 ? Math.round((totalMutu / totalSks) * 100) / 100 : 0;

  const totalSksKumulatif = nilaiKumulatifList.reduce((sum, n) => sum + n.sks, 0);
  const totalMutuKumulatif = nilaiKumulatifList.reduce((sum, n) => sum + (GRADE_BOBOT[n.grade] ?? 0) * n.sks, 0);
  const ipk = totalSksKumulatif > 0 ? Math.round((totalMutuKumulatif / totalSksKumulatif) * 100) / 100 : 0;

  const yearOffset = Math.floor((semesterNum - 1) / 2);
  const isGenap = semesterNum % 2 === 0;
  const tahunMulaiPeriode = mahasiswa.tahunMasuk + yearOffset;

  return {
    mahasiswa: {
      id: mahasiswa.id,
      nim: mahasiswa.nim,
      namaLengkap: mahasiswa.namaLengkap,
    },
    jurusan: mahasiswa.jurusan
      ? { namaJurusan: mahasiswa.jurusan.namaJurusan, jenjangPendidikan: mahasiswa.jurusan.jenjangPendidikan }
      : null,
    semester: semesterNum,
    tahunAjaranLabel: `${tahunMulaiPeriode}/${tahunMulaiPeriode + 1} ${isGenap ? 'GENAP' : 'GANJIL'}`,
    periode: `${tahunMulaiPeriode}${isGenap ? 2 : 1}`,
    nilai,
    totalSks,
    totalMutu,
    ips,
    ipk,
  };
};

/** KHS seluruh semester yang punya nilai (urut semester), untuk cetak "Semua Semester". */
const getKhsSemuaSemester = async (mahasiswaId) => {
  const rows = await NilaiMahasiswa.findAll({ where: { mahasiswaId }, attributes: ['semester'], group: ['semester'], order: [['semester', 'ASC']], raw: true });
  const list = [];
  for (const { semester } of rows) list.push(await getKhsData(mahasiswaId, semester));
  return list.filter((d) => d.nilai.length);
};

module.exports = {
  getKhsSemuaSemester, searchMahasiswa, getKhsData };
