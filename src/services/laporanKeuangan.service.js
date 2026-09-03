const { Op } = require('sequelize');
const { TagihanKuliah, PembayaranKuliah, TunggakanMahasiswa, PembayaranSertifikasi, Mahasiswa, Jurusan } = require('../models');
const { buildSisaTaSkripsiMap } = require('./pembayaranTaSkripsi.service');
const { buildSisaBiayaLainMap } = require('./pembayaranLain.service');
const { buildWorkbook } = require('../utils/excel');

/**
 * Total tunggakan per mahasiswa = sisa tagihan kuliah terkomputasi (tagihan - pembayaran, dari
 * engine Generate Tagihan) DITAMBAH saldo tunggakan manual (TunggakanMahasiswa — dipakai untuk
 * saldo awal migrasi dari sistem lama / penyesuaian manual lain, lihat model TunggakanMahasiswa)
 * DITAMBAH sisa tagihan TA/Skripsi (tarif pendaftaran/perpanjangan dikurangi yang sudah dibayar,
 * lihat pembayaranTaSkripsi.service.js#buildSisaTaSkripsiMap) DITAMBAH sisa tagihan biaya lain
 * (tarif per angkatan dikurangi yang sudah dibayar, lihat
 * pembayaranLain.service.js#buildSisaBiayaLainMap). Keempat sumber digabung supaya satu angka
 * "tunggakan" mencerminkan seluruh kewajiban mahasiswa, bukan cuma salah satu sumbernya.
 */
const buildTunggakanPerMahasiswa = async (tahunAjaranId) => {
  const tagihanWhere = {};
  if (tahunAjaranId) tagihanWhere.tahunAjaranId = tahunAjaranId;

  const [tagihanList, manualList, taSkripsiMap, biayaLainMap] = await Promise.all([
    TagihanKuliah.findAll({
      where: tagihanWhere,
      include: [
        { model: Mahasiswa, as: 'mahasiswa', include: [{ model: Jurusan, as: 'jurusan' }] },
        { model: PembayaranKuliah, as: 'pembayaranList' },
      ],
    }),
    TunggakanMahasiswa.findAll({
      include: [{ model: Mahasiswa, as: 'mahasiswa', include: [{ model: Jurusan, as: 'jurusan' }] }],
    }),
    buildSisaTaSkripsiMap(),
    buildSisaBiayaLainMap(),
  ]);

  const byMahasiswa = new Map();
  const ensure = (mahasiswa) => {
    if (!byMahasiswa.has(mahasiswa.id)) {
      byMahasiswa.set(mahasiswa.id, {
        mahasiswaId: mahasiswa.id,
        nim: mahasiswa.nim,
        namaLengkap: mahasiswa.namaLengkap,
        prodi: mahasiswa.jurusan?.namaJurusan ?? '-',
        tagihanSisa: 0,
        tunggakanManual: 0,
        tagihanTaSkripsisSisa: 0,
        tagihanBiayaLainSisa: 0,
      });
    }
    return byMahasiswa.get(mahasiswa.id);
  };

  tagihanList.forEach((tagihan) => {
    if (!tagihan.mahasiswa) return;
    const entry = ensure(tagihan.mahasiswa);
    const dibayar = (tagihan.pembayaranList ?? []).reduce((sum, p) => sum + p.nominal, 0);
    entry.tagihanSisa += Math.max(tagihan.totalTagihan - dibayar, 0);
  });

  manualList.forEach((row) => {
    if (!row.mahasiswa) return;
    const entry = ensure(row.mahasiswa);
    entry.tunggakanManual += row.nominal;
  });

  const ensureMissing = async (idMap) => {
    const missingIds = [...idMap.keys()].filter((id) => !byMahasiswa.has(id));
    const missingMahasiswaList = missingIds.length
      ? await Mahasiswa.findAll({ where: { id: missingIds }, include: [{ model: Jurusan, as: 'jurusan' }] })
      : [];
    missingMahasiswaList.forEach((mahasiswa) => ensure(mahasiswa));
  };

  if (taSkripsiMap.size) {
    await ensureMissing(taSkripsiMap);
    taSkripsiMap.forEach((sisa, mahasiswaId) => {
      const entry = byMahasiswa.get(mahasiswaId);
      if (entry) entry.tagihanTaSkripsisSisa += sisa;
    });
  }

  if (biayaLainMap.size) {
    await ensureMissing(biayaLainMap);
    biayaLainMap.forEach((sisa, mahasiswaId) => {
      const entry = byMahasiswa.get(mahasiswaId);
      if (entry) entry.tagihanBiayaLainSisa += sisa;
    });
  }

  return [...byMahasiswa.values()].map((entry) => ({
    ...entry,
    totalTunggakan: entry.tagihanSisa + entry.tunggakanManual + entry.tagihanTaSkripsisSisa + entry.tagihanBiayaLainSisa,
  }));
};

const listTunggakanMahasiswa = async ({ tahunAjaranId } = {}) => {
  const all = await buildTunggakanPerMahasiswa(tahunAjaranId);
  return all.filter((r) => r.totalTunggakan > 0).sort((a, b) => b.totalTunggakan - a.totalTunggakan);
};

const listBebasTunggakan = async ({ tahunAjaranId } = {}) => {
  const all = await buildTunggakanPerMahasiswa(tahunAjaranId);
  return all.filter((r) => r.totalTunggakan <= 0).sort((a, b) => a.namaLengkap.localeCompare(b.namaLengkap));
};

const listLaporanUangKuliah = async ({ tahunAjaranId } = {}) => {
  const tagihanWhere = {};
  if (tahunAjaranId) tagihanWhere.tahunAjaranId = tahunAjaranId;

  const tagihanList = await TagihanKuliah.findAll({
    where: tagihanWhere,
    include: [
      { model: Mahasiswa, as: 'mahasiswa', include: [{ model: Jurusan, as: 'jurusan' }] },
      { model: PembayaranKuliah, as: 'pembayaranList' },
    ],
  });

  const byProdi = new Map();
  tagihanList.forEach((tagihan) => {
    const prodi = tagihan.mahasiswa?.jurusan?.namaJurusan ?? 'Tanpa Prodi';
    if (!byProdi.has(prodi)) {
      byProdi.set(prodi, { prodi, jumlahMahasiswa: 0, totalTagihan: 0, totalDibayar: 0 });
    }
    const entry = byProdi.get(prodi);
    const dibayar = (tagihan.pembayaranList ?? []).reduce((sum, p) => sum + p.nominal, 0);
    entry.jumlahMahasiswa += 1;
    entry.totalTagihan += tagihan.totalTagihan;
    entry.totalDibayar += dibayar;
  });

  const data = [...byProdi.values()]
    .map((entry) => ({ ...entry, totalTunggakan: Math.max(entry.totalTagihan - entry.totalDibayar, 0) }))
    .sort((a, b) => a.prodi.localeCompare(b.prodi));

  const grandTotal = data.reduce(
    (acc, r) => ({
      jumlahMahasiswa: acc.jumlahMahasiswa + r.jumlahMahasiswa,
      totalTagihan: acc.totalTagihan + r.totalTagihan,
      totalDibayar: acc.totalDibayar + r.totalDibayar,
      totalTunggakan: acc.totalTunggakan + r.totalTunggakan,
    }),
    { jumlahMahasiswa: 0, totalTagihan: 0, totalDibayar: 0, totalTunggakan: 0 }
  );

  return { data, grandTotal };
};

/**
 * Rekap pembayaran sertifikasi per jenis pembayaran (Kompetensi/TOEFL/Komputer, dst) — pembayaran
 * sertifikasi bersifat langsung bayar-lunas (bukan tagihan yang bisa nyicil seperti uang kuliah),
 * jadi rekapnya cukup jumlah transaksi & total nominal, difilter rentang tanggal bayar & status
 * kelulusan sertifikasi kalau diisi.
 */
const listLaporanSertifikasi = async ({ dateFrom, dateTo, statusSertifikasi } = {}) => {
  const where = {};
  if (statusSertifikasi) where.statusSertifikasi = statusSertifikasi;
  if (dateFrom || dateTo) {
    where.tanggalBayar = {};
    if (dateFrom) where.tanggalBayar[Op.gte] = dateFrom;
    if (dateTo) where.tanggalBayar[Op.lte] = dateTo;
  }

  const rows = await PembayaranSertifikasi.findAll({ where });

  const byJenis = new Map();
  rows.forEach((row) => {
    if (!byJenis.has(row.jenisPembayaran)) {
      byJenis.set(row.jenisPembayaran, { jenisPembayaran: row.jenisPembayaran, jumlahTransaksi: 0, totalNominal: 0 });
    }
    const entry = byJenis.get(row.jenisPembayaran);
    entry.jumlahTransaksi += 1;
    entry.totalNominal += row.bayar;
  });

  const data = [...byJenis.values()].sort((a, b) => a.jenisPembayaran.localeCompare(b.jenisPembayaran));

  const grandTotal = data.reduce(
    (acc, r) => ({
      jumlahTransaksi: acc.jumlahTransaksi + r.jumlahTransaksi,
      totalNominal: acc.totalNominal + r.totalNominal,
    }),
    { jumlahTransaksi: 0, totalNominal: 0 }
  );

  return { data, grandTotal };
};

const TUNGGAKAN_MAHASISWA_EXPORT_COLUMNS = [
  { header: 'NIM', key: 'nim', width: 20 },
  { header: 'Nama', key: 'namaLengkap', width: 30 },
  { header: 'Prodi', key: 'prodi', width: 25 },
  { header: 'Sisa Tagihan Kuliah', key: 'tagihanSisa', width: 20 },
  { header: 'Sisa TA/Skripsi', key: 'tagihanTaSkripsisSisa', width: 20 },
  { header: 'Sisa Biaya Lain', key: 'tagihanBiayaLainSisa', width: 20 },
  { header: 'Tunggakan Lain (Manual)', key: 'tunggakanManual', width: 22 },
  { header: 'Total Tunggakan', key: 'totalTunggakan', width: 20 },
];

/** Export detail tunggakan, satu baris per mahasiswa — dasar hitungannya sama dengan listTunggakanMahasiswa. */
const exportTunggakanPerMahasiswa = async ({ tahunAjaranId } = {}) => {
  const rows = await listTunggakanMahasiswa({ tahunAjaranId });
  return buildWorkbook('Tunggakan per Mahasiswa', TUNGGAKAN_MAHASISWA_EXPORT_COLUMNS, rows);
};

const TUNGGAKAN_JURUSAN_EXPORT_COLUMNS = [
  { header: 'Prodi', key: 'prodi', width: 25 },
  { header: 'Jumlah Mahasiswa Menunggak', key: 'jumlahMahasiswa', width: 25 },
  { header: 'Sisa Tagihan Kuliah', key: 'tagihanSisa', width: 20 },
  { header: 'Sisa TA/Skripsi', key: 'tagihanTaSkripsisSisa', width: 20 },
  { header: 'Sisa Biaya Lain', key: 'tagihanBiayaLainSisa', width: 20 },
  { header: 'Tunggakan Lain (Manual)', key: 'tunggakanManual', width: 22 },
  { header: 'Total Tunggakan', key: 'totalTunggakan', width: 20 },
];

/**
 * Rekap tunggakan digabung per prodi — dasar hitungannya sama dengan listTunggakanMahasiswa,
 * dipakai baik untuk halaman Laporan Tunggakan (rekap per prodi) maupun tombol "Export per
 * Jurusan" di Laporan Tunggakan Mahasiswa supaya angkanya selalu konsisten.
 */
const buildTunggakanPerJurusan = async (tahunAjaranId) => {
  const rows = await listTunggakanMahasiswa({ tahunAjaranId });

  const byProdi = new Map();
  rows.forEach((row) => {
    if (!byProdi.has(row.prodi)) {
      byProdi.set(row.prodi, {
        prodi: row.prodi,
        jumlahMahasiswa: 0,
        tagihanSisa: 0,
        tagihanTaSkripsisSisa: 0,
        tagihanBiayaLainSisa: 0,
        tunggakanManual: 0,
        totalTunggakan: 0,
      });
    }
    const entry = byProdi.get(row.prodi);
    entry.jumlahMahasiswa += 1;
    entry.tagihanSisa += row.tagihanSisa;
    entry.tagihanTaSkripsisSisa += row.tagihanTaSkripsisSisa;
    entry.tagihanBiayaLainSisa += row.tagihanBiayaLainSisa;
    entry.tunggakanManual += row.tunggakanManual;
    entry.totalTunggakan += row.totalTunggakan;
  });

  return [...byProdi.values()].sort((a, b) => a.prodi.localeCompare(b.prodi));
};

const listTunggakanPerJurusan = async ({ tahunAjaranId } = {}) => {
  const data = await buildTunggakanPerJurusan(tahunAjaranId);
  const grandTotal = data.reduce(
    (acc, r) => ({
      jumlahMahasiswa: acc.jumlahMahasiswa + r.jumlahMahasiswa,
      tagihanSisa: acc.tagihanSisa + r.tagihanSisa,
      tagihanTaSkripsisSisa: acc.tagihanTaSkripsisSisa + r.tagihanTaSkripsisSisa,
      tagihanBiayaLainSisa: acc.tagihanBiayaLainSisa + r.tagihanBiayaLainSisa,
      tunggakanManual: acc.tunggakanManual + r.tunggakanManual,
      totalTunggakan: acc.totalTunggakan + r.totalTunggakan,
    }),
    { jumlahMahasiswa: 0, tagihanSisa: 0, tagihanTaSkripsisSisa: 0, tagihanBiayaLainSisa: 0, tunggakanManual: 0, totalTunggakan: 0 }
  );
  return { data, grandTotal };
};

/** Export rekap tunggakan digabung per prodi — dasar hitungannya sama dengan listTunggakanMahasiswa. */
const exportTunggakanPerJurusan = async ({ tahunAjaranId } = {}) => {
  const data = await buildTunggakanPerJurusan(tahunAjaranId);
  return buildWorkbook('Tunggakan per Jurusan', TUNGGAKAN_JURUSAN_EXPORT_COLUMNS, data);
};

module.exports = {
  listTunggakanMahasiswa,
  listBebasTunggakan,
  listLaporanUangKuliah,
  listLaporanSertifikasi,
  listTunggakanPerJurusan,
  exportTunggakanPerMahasiswa,
  exportTunggakanPerJurusan,
};
