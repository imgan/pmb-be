const { Op } = require('sequelize');
const {
  PembayaranKuliah,
  PembayaranSertifikasi,
  PembayaranWisuda,
  PerpanjanganTaSkripsi,
  TagihanKuliah,
  TunggakanMahasiswa,
  Mahasiswa,
  User,
} = require('../models');

// Pakai komponen tanggal LOKAL (bukan toISOString, yang konversi ke UTC dan bisa geser 1 hari
// di WIB/UTC+7) supaya konsisten dengan kolom DATEONLY `tanggalBayar` yang bersifat tanpa-zona.
const isoDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const addDays = (d, n) => {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
};

const JENIS_LABEL = {
  KULIAH: 'Pembayaran Kuliah',
  SERTIFIKASI: 'Sertifikasi',
  WISUDA: 'Wisuda',
  PERPANJANGAN_TA: 'Perpanjangan TA/Skripsi',
};

/**
 * Kumpulkan transaksi dari 4 tabel pembayaran (kuliah, sertifikasi, wisuda, perpanjangan TA/skripsi)
 * dalam satu bentuk seragam supaya bisa direkap/ditampilkan bersama di dashboard kasir. Nama kolom
 * nominal berbeda antar tabel (`nominal` vs `bayar`) dan relasi mahasiswa juga beda jalur
 * (PembayaranKuliah -> tagihan -> mahasiswa, sisanya langsung -> mahasiswa) — dinormalisasi di sini.
 */
const fetchTransaksi = async (rangeStart) => {
  const where = { tanggalBayar: { [Op.gte]: isoDate(rangeStart) } };

  const [kuliah, sertifikasi, wisuda, perpanjangan] = await Promise.all([
    PembayaranKuliah.findAll({
      where,
      include: [
        { model: TagihanKuliah, as: 'tagihan', include: [{ model: Mahasiswa, as: 'mahasiswa' }] },
        { model: User, as: 'creator', attributes: ['id', 'username'] },
      ],
      order: [['id', 'DESC']],
    }),
    PembayaranSertifikasi.findAll({
      where,
      include: [
        { model: Mahasiswa, as: 'mahasiswa' },
        { model: User, as: 'creator', attributes: ['id', 'username'] },
      ],
      order: [['id', 'DESC']],
    }),
    PembayaranWisuda.findAll({
      where,
      include: [
        { model: Mahasiswa, as: 'mahasiswa' },
        { model: User, as: 'creator', attributes: ['id', 'username'] },
      ],
      order: [['id', 'DESC']],
    }),
    PerpanjanganTaSkripsi.findAll({
      where,
      include: [
        { model: Mahasiswa, as: 'mahasiswa' },
        { model: User, as: 'creator', attributes: ['id', 'username'] },
      ],
      order: [['id', 'DESC']],
    }),
  ]);

  const normalize = (rows, jenis, amountField, mahasiswaOf) =>
    rows.map((row) => ({
      id: `${jenis}-${row.id}`,
      jenis,
      jenisLabel: JENIS_LABEL[jenis],
      tanggalBayar: row.tanggalBayar,
      createdAt: row.createdAt,
      noBukti: row.noBukti,
      nominal: row[amountField],
      kodeBank: row.kodeBank || null,
      nim: mahasiswaOf(row)?.nim ?? '-',
      namaLengkap: mahasiswaOf(row)?.namaLengkap ?? '-',
      kasir: row.creator?.username ?? '-',
    }));

  return [
    ...normalize(kuliah, 'KULIAH', 'nominal', (r) => r.tagihan?.mahasiswa),
    ...normalize(sertifikasi, 'SERTIFIKASI', 'bayar', (r) => r.mahasiswa),
    ...normalize(wisuda, 'WISUDA', 'bayar', (r) => r.mahasiswa),
    ...normalize(perpanjangan, 'PERPANJANGAN_TA', 'nominal', (r) => r.mahasiswa),
  ];
};

const getTotalTunggakan = async () => {
  const tagihanList = await TagihanKuliah.findAll({
    include: [{ model: PembayaranKuliah, as: 'pembayaranList' }],
  });
  const mahasiswaMenunggak = new Set();
  let sisaTagihanTotal = 0;
  tagihanList.forEach((tagihan) => {
    const dibayar = (tagihan.pembayaranList ?? []).reduce((sum, p) => sum + p.nominal, 0);
    const sisa = Math.max(tagihan.totalTagihan - dibayar, 0);
    sisaTagihanTotal += sisa;
    if (sisa > 0) mahasiswaMenunggak.add(tagihan.mahasiswaId);
  });

  const manualList = await TunggakanMahasiswa.findAll();
  const tunggakanManualTotal = manualList.reduce((sum, r) => sum + r.nominal, 0);
  manualList.forEach((r) => {
    if (r.nominal > 0) mahasiswaMenunggak.add(r.mahasiswaId);
  });

  return {
    totalTunggakan: sisaTagihanTotal + tunggakanManualTotal,
    jumlahMahasiswaMenunggak: mahasiswaMenunggak.size,
  };
};

const getDashboard = async () => {
  const now = new Date();
  const today = isoDate(now);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const fourteenDaysAgo = addDays(now, -13);
  const rangeStart = monthStart < fourteenDaysAgo ? monthStart : fourteenDaysAgo;

  const [transaksi, tunggakan] = await Promise.all([fetchTransaksi(rangeStart), getTotalTunggakan()]);

  const transaksiHariIni = transaksi.filter((t) => t.tanggalBayar === today);
  const transaksiBulanIni = transaksi.filter((t) => t.tanggalBayar >= isoDate(monthStart));

  const sum = (rows) => rows.reduce((s, r) => s + r.nominal, 0);

  // Tren 14 hari terakhir, dipakai untuk grafik garis nominal transaksi kasir per hari.
  const trend14Hari = [];
  for (let i = 13; i >= 0; i -= 1) {
    const d = addDays(now, -i);
    const key = isoDate(d);
    const rowsOfDay = transaksi.filter((t) => t.tanggalBayar === key);
    trend14Hari.push({
      label: `${d.getDate()}/${d.getMonth() + 1}`,
      value: sum(rowsOfDay),
      jumlahTransaksi: rowsOfDay.length,
    });
  }

  // Breakdown per jenis pembayaran & per bank, bulan berjalan.
  const breakdownJenis = Object.entries(JENIS_LABEL).map(([jenis, label]) => ({
    label,
    value: sum(transaksiBulanIni.filter((t) => t.jenis === jenis)),
  }));

  const bankMap = new Map();
  transaksiBulanIni.forEach((t) => {
    const key = t.kodeBank || 'Tunai/Lainnya';
    bankMap.set(key, (bankMap.get(key) ?? 0) + t.nominal);
  });
  const breakdownBank = [...bankMap.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);

  const transaksiTerbaru = [...transaksi]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);

  return {
    hariIni: { jumlahTransaksi: transaksiHariIni.length, totalNominal: sum(transaksiHariIni) },
    bulanIni: { jumlahTransaksi: transaksiBulanIni.length, totalNominal: sum(transaksiBulanIni) },
    tunggakan,
    trend14Hari,
    breakdownJenis,
    breakdownBank,
    transaksiTerbaru,
  };
};

module.exports = { getDashboard };
