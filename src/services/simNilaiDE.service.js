const { Op } = require('sequelize');
const { NilaiMahasiswa, Mahasiswa, Jurusan } = require('../models');

const GRADE_ORDER = { D: 0, E: 1 };

const listNilaiDE = async ({ prodi, kodeMataKuliah } = {}) => {
  const nilaiWhere = { grade: { [Op.in]: ['D', 'E'] } };
  if (kodeMataKuliah) nilaiWhere.kodeMataKuliah = kodeMataKuliah;

  const jurusanWhere = {};
  if (prodi) jurusanWhere.namaJurusan = prodi;

  const nilaiList = await NilaiMahasiswa.findAll({
    where: nilaiWhere,
    include: [
      {
        model: Mahasiswa,
        as: 'mahasiswa',
        attributes: ['id'],
        // required: true di sini wajib supaya where di include jurusan (nested) benar-benar
        // menyaring baris NilaiMahasiswa, bukan cuma mengosongkan kolom jurusan di hasil join.
        required: !!prodi,
        include: [
          {
            model: Jurusan,
            as: 'jurusan',
            attributes: ['id', 'namaJurusan'],
            required: !!prodi,
            where: Object.keys(jurusanWhere).length ? jurusanWhere : undefined,
          },
        ],
      },
    ],
  });

  // Satu program studi bisa punya beberapa baris jurusan berbeda per golongan kelas
  // (Reguler/Karyawan/Kelas Malam) — digabung per NAMA jurusan, sama seperti laporan lain.
  const grouped = new Map();
  nilaiList.forEach((n) => {
    const namaJurusan = n.mahasiswa?.jurusan?.namaJurusan ?? 'Tanpa Jurusan';
    const key = `${namaJurusan}|${n.kodeMataKuliah}|${n.grade}`;
    if (!grouped.has(key)) {
      grouped.set(key, {
        prodi: namaJurusan,
        kodeMataKuliah: n.kodeMataKuliah,
        namaMataKuliah: n.namaMataKuliah,
        sks: n.sks,
        grade: n.grade,
        jumlah: 0,
      });
    }
    grouped.get(key).jumlah += 1;
  });

  return [...grouped.values()].sort(
    (a, b) =>
      a.prodi.localeCompare(b.prodi) ||
      a.kodeMataKuliah.localeCompare(b.kodeMataKuliah) ||
      (GRADE_ORDER[a.grade] ?? 0) - (GRADE_ORDER[b.grade] ?? 0)
  );
};

module.exports = { listNilaiDE };
