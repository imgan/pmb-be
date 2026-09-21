const { Op } = require('sequelize');
const { Krs, TahunAjaran, Mahasiswa, Jurusan, NilaiMahasiswa } = require('../models');
const { GRADE_BOBOT } = require('../utils/gradeScale');

// IPS = indeks prestasi semester berjalan (nilai_mahasiswa.semester === semester KRS ybs).
// IPK = indeks prestasi kumulatif s.d. semester berjalan (nilai_mahasiswa.semester <= semester KRS ybs).
const hitungIp = (nilaiList) => {
  const totalSks = nilaiList.reduce((sum, n) => sum + n.sks, 0);
  const totalMutu = nilaiList.reduce((sum, n) => sum + (GRADE_BOBOT[n.grade] ?? 0) * n.sks, 0);
  return totalSks > 0 ? totalMutu / totalSks : 0;
};

const listIpk = async ({ tahun, semester } = {}) => {
  const tahunAjaranWhere = {};
  if (tahun) tahunAjaranWhere.tahunMulai = tahun;
  if (semester) tahunAjaranWhere.jenisSemester = semester;

  const krsList = await Krs.findAll({
    include: [
      { model: TahunAjaran, as: 'tahunAjaran', attributes: ['id', 'tahunMulai', 'jenisSemester'], where: tahunAjaranWhere },
      {
        model: Mahasiswa,
        as: 'mahasiswa',
        attributes: ['id'],
        include: [{ model: Jurusan, as: 'jurusan', attributes: ['id', 'namaJurusan'] }],
      },
    ],
  });
  if (krsList.length === 0) return [];

  const mahasiswaIds = [...new Set(krsList.map((krs) => krs.mahasiswaId))];
  const nilaiList = await NilaiMahasiswa.findAll({
    attributes: ['mahasiswaId', 'semester', 'sks', 'grade'],
    where: { mahasiswaId: { [Op.in]: mahasiswaIds } },
  });
  const nilaiByMahasiswa = new Map();
  nilaiList.forEach((n) => {
    const list = nilaiByMahasiswa.get(n.mahasiswaId) ?? [];
    list.push(n);
    nilaiByMahasiswa.set(n.mahasiswaId, list);
  });

  // Satu program studi bisa punya beberapa baris jurusan berbeda per golongan kelas
  // (Reguler/Karyawan/Kelas Malam) — digabung per NAMA jurusan & tahun ajaran/semester,
  // sama seperti laporan Student Body & FRS.
  const grouped = new Map();
  krsList.forEach((krs) => {
    const namaJurusan = krs.mahasiswa?.jurusan?.namaJurusan ?? 'Tanpa Jurusan';
    const key = `${krs.tahunAjaran.tahunMulai}|${krs.tahunAjaran.jenisSemester}|${namaJurusan}`;
    if (!grouped.has(key)) {
      grouped.set(key, {
        tahunAkademik: krs.tahunAjaran.tahunMulai,
        semester: krs.tahunAjaran.jenisSemester,
        prodi: namaJurusan,
        jumlahMahasiswa: 0,
        totalIpk: 0,
        totalIps: 0,
      });
    }

    const nilai = nilaiByMahasiswa.get(krs.mahasiswaId) ?? [];
    const ips = hitungIp(nilai.filter((n) => n.semester === krs.semester));
    const ipk = hitungIp(nilai.filter((n) => n.semester <= krs.semester));

    const entry = grouped.get(key);
    entry.jumlahMahasiswa += 1;
    entry.totalIpk += ipk;
    entry.totalIps += ips;
  });

  return [...grouped.values()]
    .sort((a, b) => b.tahunAkademik - a.tahunAkademik || a.prodi.localeCompare(b.prodi))
    .map(({ totalIpk, totalIps, jumlahMahasiswa, ...rest }) => ({
      ...rest,
      jumlahMahasiswa,
      rataRataIpk: jumlahMahasiswa > 0 ? Number((totalIpk / jumlahMahasiswa).toFixed(2)) : 0,
      rataRataIps: jumlahMahasiswa > 0 ? Number((totalIps / jumlahMahasiswa).toFixed(2)) : 0,
    }));
};

module.exports = { listIpk };
