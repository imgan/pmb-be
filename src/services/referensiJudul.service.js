const { Op } = require('sequelize');
const { PengajuanTa, PeriodePengajuanTa, Yudisium, Mahasiswa, Jurusan, TahunAjaran } = require('../models');
const { formatTahunAjaran } = require('../utils/tahunAjaran');

/**
 * Referensi judul TA/Skripsi untuk portal dosen (Lain-Lain → Referensi Judul), diambil dari input
 * mahasiswa: Pengajuan TA yang disetujui prodi. Bila mahasiswa sudah yudisium dan judulnya diisi,
 * judul Yudisium (judul final) yang dipakai. Periode = tahun akademik tanggal mulai periode pengajuan
 * (atau tanggal yudisium): Juli–Desember = GANJIL, Januari–Juni = GENAP.
 */

const includeMahasiswa = {
  model: Mahasiswa,
  as: 'mahasiswa',
  attributes: ['id', 'nim', 'namaLengkap', 'jurusanId'],
  include: [{ model: Jurusan, as: 'jurusan', attributes: ['id', 'namaJurusan'], required: false }],
};

const periodeDari = (tanggal) => {
  if (!tanggal) return null;
  const d = new Date(tanggal);
  if (Number.isNaN(d.getTime())) return null;
  return d.getMonth() >= 6 ? { tahunMulai: d.getFullYear(), jenisSemester: 'GANJIL' } : { tahunMulai: d.getFullYear() - 1, jenisSemester: 'GENAP' };
};

/** Semua referensi judul (satu per mahasiswa), lengkap dengan prodi & tahun akademik. */
const kumpulkanReferensi = async () => {
  const [pengajuan, yudisium, tahunAjaran] = await Promise.all([
    PengajuanTa.findAll({
      where: { status: 'DISETUJUI' },
      attributes: ['id', 'mahasiswaId', 'judul', 'updatedAt'],
      include: [includeMahasiswa, { model: PeriodePengajuanTa, as: 'periode', attributes: ['tanggalMulai'], required: false }],
      order: [['updatedAt', 'DESC']],
    }),
    Yudisium.findAll({
      where: { judul: { [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: '' }] } },
      attributes: ['id', 'mahasiswaId', 'judul', 'tanggalYudisium', 'tanggalSk', 'createdAt'],
      include: [includeMahasiswa],
    }),
    TahunAjaran.findAll({ attributes: ['id', 'nama', 'tahunMulai', 'jenisSemester'] }),
  ]);
  const cariTa = (tanggal) => {
    const p = periodeDari(tanggal);
    return p ? tahunAjaran.find((t) => t.tahunMulai === p.tahunMulai && t.jenisSemester === p.jenisSemester) ?? null : null;
  };
  const toRef = (sumber, row, judul, tanggal) => {
    const ta = cariTa(tanggal);
    return {
      id: `${sumber}-${row.id}`,
      sumber,
      nim: row.mahasiswa?.nim ?? '-',
      nama: row.mahasiswa?.namaLengkap ?? '-',
      judul,
      jurusanId: row.mahasiswa?.jurusanId ?? null,
      jurusan: row.mahasiswa?.jurusan ? { id: row.mahasiswa.jurusan.id, namaJurusan: row.mahasiswa.jurusan.namaJurusan } : null,
      tahunAjaranId: ta?.id ?? null,
      tahunAjaran: ta ? { id: ta.id, nama: ta.nama, jenisSemester: ta.jenisSemester, label: formatTahunAjaran(ta) } : null,
    };
  };

  const byMahasiswa = new Map();
  pengajuan.forEach((p) => {
    // Pengajuan disetujui terbaru per mahasiswa (urut updatedAt DESC).
    if (!byMahasiswa.has(p.mahasiswaId)) byMahasiswa.set(p.mahasiswaId, toRef('pengajuan', p, p.judul, p.periode?.tanggalMulai ?? p.updatedAt));
  });
  yudisium.forEach((y) => byMahasiswa.set(y.mahasiswaId, toRef('yudisium', y, y.judul, y.tanggalYudisium ?? y.tanggalSk ?? y.createdAt)));
  return [...byMahasiswa.values()];
};

/** Pilihan filter portal dosen: prodi & periode yang punya referensi judul. */
const getFilterOptions = async () => {
  const refs = await kumpulkanReferensi();
  const prodi = new Map();
  const periode = new Map();
  refs.forEach((r) => {
    if (r.jurusan) prodi.set(r.jurusan.id, { value: r.jurusan.id, label: r.jurusan.namaJurusan });
    if (r.tahunAjaran) periode.set(r.tahunAjaran.id, { value: r.tahunAjaran.id, label: r.tahunAjaran.label });
  });
  return {
    prodi: [...prodi.values()].sort((a, b) => a.label.localeCompare(b.label)),
    periode: [...periode.values()].sort((a, b) => b.label.localeCompare(a.label)),
  };
};

/** Daftar referensi untuk portal dosen (filter jurusanId, tahunAjaranId), urut NIM. */
const listUntukDosen = async (query) => {
  const jurusanId = Number(query.jurusanId) || null;
  const tahunAjaranId = Number(query.tahunAjaranId) || null;
  return (await kumpulkanReferensi())
    .filter((r) => (!jurusanId || r.jurusanId === jurusanId) && (!tahunAjaranId || r.tahunAjaranId === tahunAjaranId))
    .sort((a, b) => a.nim.localeCompare(b.nim));
};

module.exports = { getFilterOptions, listUntukDosen };
