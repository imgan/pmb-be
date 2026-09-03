const { Mahasiswa, Jurusan, Yudisium } = require('../models');

// Status masuk 'BARU' dihitung sebagai kolom "Baru"; sisanya (TRANSFER_LUAR/TRANSFER_DALAM/
// TRANSFER_LUAR_KARYAWAN/TRANSFER_DALAM_KARYAWAN) digabung sebagai "Alih Jenjang/RPL" — skema
// data saat ini tidak membedakan alih jenjang vs RPL vs transfer institusi secara terpisah.
const isBaru = (statusMasuk) => statusMasuk === 'BARU';

// CUTI bersifat sementara (mahasiswa masih bisa aktif kembali), jadi tidak dihitung sebagai
// keluar/DO — status keluar lain dianggap permanen keluar dari kampus.
const isKdo = (statusKeluar) => !!statusKeluar && statusKeluar !== 'CUTI';

const emptyCounters = () => ({
  terdaftarBaru: 0,
  terdaftarAlih: 0,
  lulusBaru: 0,
  lulusAlih: 0,
  kdoBaru: 0,
  kdoAlih: 0,
});

const withDerived = (row) => {
  const terdaftarJumlah = row.terdaftarBaru + row.terdaftarAlih;
  const lulusJumlah = row.lulusBaru + row.lulusAlih;
  const kdoJumlah = row.kdoBaru + row.kdoAlih;
  return {
    ...row,
    terdaftarJumlah,
    lulusJumlah,
    kdoJumlah,
    jumlah: terdaftarJumlah - lulusJumlah - kdoJumlah,
  };
};

const listStudentBody = async () => {
  const mahasiswaList = await Mahasiswa.findAll({
    attributes: ['id', 'jurusanId', 'tahunMasuk', 'statusMasuk', 'statusKeluar'],
    include: [{ model: Jurusan, as: 'jurusan', attributes: ['id', 'namaJurusan'] }],
  });

  const yudisiumRows = await Yudisium.findAll({ attributes: ['mahasiswaId'] });
  const lulusIds = new Set(yudisiumRows.map((y) => y.mahasiswaId));

  // Kelompokkan per NAMA jurusan (bukan jurusan_id) — satu program studi bisa punya beberapa
  // baris jurusan berbeda per golongan kelas (Reguler/Karyawan/Kelas Malam), tapi laporan
  // Student Body ini melaporkan per program studi, jadi semua golongan digabung.
  const byJurusan = new Map();

  mahasiswaList.forEach((m) => {
    const namaJurusan = m.jurusan?.namaJurusan ?? 'Tanpa Jurusan';
    if (!byJurusan.has(namaJurusan)) byJurusan.set(namaJurusan, new Map());
    const byTahun = byJurusan.get(namaJurusan);

    if (!byTahun.has(m.tahunMasuk)) byTahun.set(m.tahunMasuk, emptyCounters());
    const counter = byTahun.get(m.tahunMasuk);

    const baru = isBaru(m.statusMasuk);
    const lulus = lulusIds.has(m.id);
    const kdo = !lulus && isKdo(m.statusKeluar);

    if (lulus) {
      if (baru) counter.lulusBaru += 1;
      else counter.lulusAlih += 1;
    } else if (kdo) {
      if (baru) counter.kdoBaru += 1;
      else counter.kdoAlih += 1;
    }

    if (baru) counter.terdaftarBaru += 1;
    else counter.terdaftarAlih += 1;
  });

  const result = [...byJurusan.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([namaJurusan, byTahun]) => {
      const rows = [...byTahun.entries()]
        .sort(([tahunA], [tahunB]) => tahunB - tahunA)
        .map(([tahunMasuk, counter]) => withDerived({ tahunMasuk, ...counter }));
      const total = rows.reduce((sum, r) => sum + r.jumlah, 0);
      return { namaJurusan, rows, total };
    });

  return result;
};

module.exports = { listStudentBody };
