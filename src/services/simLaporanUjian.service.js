const { KehadiranUjianMahasiswa, TahunAjaran, Jurusan } = require('../models');

const listLaporanUjian = async ({ tahun, jenisUjian } = {}) => {
  // Semua program studi selalu ditampilkan (termasuk yang jumlahnya 0 untuk filter ini),
  // sama seperti tampilan referensi — jadi mulai dari daftar Jurusan, bukan dari baris
  // kehadiran ujian yang ada (yang bisa saja belum diisi untuk kombinasi tahun/jenis tertentu).
  const jurusanList = await Jurusan.findAll({ attributes: ['id', 'namaJurusan'] });
  const prodiNames = [...new Set(jurusanList.map((j) => j.namaJurusan))].sort((a, b) => a.localeCompare(b));

  const tahunAjaranWhere = {};
  if (tahun) tahunAjaranWhere.tahunMulai = tahun;
  const where = {};
  if (jenisUjian) where.jenisUjian = jenisUjian;

  const rows = await KehadiranUjianMahasiswa.findAll({
    where,
    include: [
      { model: TahunAjaran, as: 'tahunAjaran', attributes: [], where: tahunAjaranWhere, required: true },
      { model: Jurusan, as: 'jurusan', attributes: ['id', 'namaJurusan'] },
    ],
  });

  const jumlahByProdi = new Map();
  rows.forEach((row) => {
    const prodi = row.jurusan.namaJurusan;
    jumlahByProdi.set(prodi, (jumlahByProdi.get(prodi) ?? 0) + row.jumlahHadir);
  });

  const data = prodiNames.map((prodi) => ({ prodi, jumlah: jumlahByProdi.get(prodi) ?? 0 }));
  const grandTotal = data.reduce((sum, r) => sum + r.jumlah, 0);

  return { data, grandTotal };
};

module.exports = { listLaporanUjian };
