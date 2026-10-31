const { Op } = require('sequelize');
const { TagihanKuliah, PembayaranKuliah, TunggakanMahasiswa, PembayaranSertifikasi, Mahasiswa, Jurusan, TahunAjaran } = require('../models');
const { hitungSaldoTagihan, ringkasanKewajibanMahasiswa, urutanPeriode } = require('../utils/tagihanSaldo');
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
        { model: TahunAjaran, as: 'tahunAjaran', attributes: ['id', 'nama', 'tahunMulai', 'jenisSemester'], required: false },
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
        kodeProdi: mahasiswa.jurusan?.kodeProdi ?? null,
        tagihanSisa: 0,
        tunggakanManual: 0,
        tagihanTaSkripsisSisa: 0,
        tagihanBiayaLainSisa: 0,
      });
    }
    return byMahasiswa.get(mahasiswa.id);
  };

  // Tagihan kuliah (hasil import): per periode = sisa semester + tunggakan periode itu; tanpa filter
  // periode = kewajiban dari tagihan terbaru (tunggakannya sudah mewakili semester sebelumnya).
  const tagihanByMahasiswa = new Map();
  tagihanList.forEach((tagihan) => {
    if (!tagihan.mahasiswa) return;
    ensure(tagihan.mahasiswa);
    tagihanByMahasiswa.set(tagihan.mahasiswaId, [...(tagihanByMahasiswa.get(tagihan.mahasiswaId) ?? []), tagihan]);
  });
  tagihanByMahasiswa.forEach((list, mahasiswaId) => {
    const entry = byMahasiswa.get(mahasiswaId);
    entry.tagihanSisa += tahunAjaranId
      ? list.reduce((sum, t) => sum + hitungSaldoTagihan(t).totalKewajiban, 0)
      : ringkasanKewajibanMahasiswa(list).totalKewajiban;
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

/**
 * Ringkasan tunggakan SATU mahasiswa, rumus sama dengan buildTunggakanPerMahasiswa (sisa tagihan
 * kuliah + tunggakan manual + sisa TA/Skripsi + sisa biaya lain), tapi query-nya hanya untuk
 * mahasiswa tsb — dipakai cek batas tagihan (persentase) saat isi KRS / lihat nilai di portal
 * mahasiswa. `totalKewajiban` (pembagi persentase) = total tagihan kuliah sebelum dibayar +
 * tunggakan manual + sisa TA/Skripsi + sisa biaya lain (dua terakhir hanya tersedia sisanya).
 */
const getRingkasanTunggakanMahasiswa = async (mahasiswaId) =>
  (await getRingkasanTunggakanBatch([mahasiswaId])).get(mahasiswaId);

/** Versi banyak mahasiswa sekaligus (query sekali, bukan per mahasiswa): Map mahasiswaId -> ringkasan. */
const getRingkasanTunggakanBatch = async (mahasiswaIds) => {
  const ids = [...new Set(mahasiswaIds)];
  if (!ids.length) return new Map();
  const [tagihanList, manualList, taSkripsiMap, biayaLainMap] = await Promise.all([
    TagihanKuliah.findAll({
      where: { mahasiswaId: ids },
      include: [{ model: PembayaranKuliah, as: 'pembayaranList' }, { model: TahunAjaran, as: 'tahunAjaran', attributes: ['id', 'nama', 'tahunMulai', 'jenisSemester'], required: false }],
    }),
    TunggakanMahasiswa.findAll({ where: { mahasiswaId: ids } }),
    buildSisaTaSkripsiMap({ mahasiswaId: ids }),
    buildSisaBiayaLainMap({ mahasiswaId: ids }),
  ]);
  const tagihanByMahasiswa = new Map();
  tagihanList.forEach((t) => tagihanByMahasiswa.set(t.mahasiswaId, [...(tagihanByMahasiswa.get(t.mahasiswaId) ?? []), t]));
  const manualByMahasiswa = new Map();
  manualList.forEach((row) => manualByMahasiswa.set(row.mahasiswaId, (manualByMahasiswa.get(row.mahasiswaId) ?? 0) + row.nominal));

  return new Map(
    ids.map((id) => {
      const ringkasan = ringkasanKewajibanMahasiswa(tagihanByMahasiswa.get(id) ?? []);
      const tagihanSisa = ringkasan.totalKewajiban;
      const tagihanTotal = ringkasan.terbaru ? Math.max(ringkasan.terbaru.totalTagihan, 0) + ringkasan.tunggakan : 0;
      const tunggakanManual = manualByMahasiswa.get(id) ?? 0;
      const sisaLain = (taSkripsiMap.get(id) ?? 0) + (biayaLainMap.get(id) ?? 0);
      return [id, { totalTunggakan: tagihanSisa + tunggakanManual + sisaLain, totalKewajiban: tagihanTotal + tunggakanManual + sisaLain }];
    })
  );
};

/** `kodeProdi` (opsional) membatasi ke satu prodi — semua golongan kelas (Reguler/Karyawan) prodi itu. */
const listTunggakanMahasiswa = async ({ tahunAjaranId, kodeProdi } = {}) => {
  const all = await buildTunggakanPerMahasiswa(tahunAjaranId);
  return all
    .filter((r) => r.totalTunggakan > 0 && (!kodeProdi || r.kodeProdi === kodeProdi))
    .sort((a, b) => b.totalTunggakan - a.totalTunggakan);
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
      byProdi.set(prodi, { prodi, jumlahMahasiswa: 0, totalTagihan: 0, totalDibayar: 0, totalTunggakan: 0 });
    }
    const entry = byProdi.get(prodi);
    const saldo = hitungSaldoTagihan(tagihan);
    entry.jumlahMahasiswa += 1;
    entry.totalTagihan += saldo.totalTagihan;
    entry.totalDibayar += saldo.totalDibayar;
    entry.totalTunggakan += saldo.totalKewajiban;
  });

  const data = [...byProdi.values()].sort((a, b) => a.prodi.localeCompare(b.prodi));

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
  { header: 'NIM', key: 'nim', width: 18 },
  { header: 'Nama', key: 'namaLengkap', width: 30 },
  { header: 'Prodi', key: 'prodi', width: 30 },
  { header: 'Tahun Akademik', key: 'tahunAkademik', width: 20 },
  { header: 'Semester', key: 'semester', width: 10 },
  { header: 'Sisa Tagihan Kuliah', key: 'tagihanSisa', width: 20 },
  { header: 'Tunggakan Semester Sebelumnya (Import)', key: 'tunggakanImport', width: 26 },
  { header: 'Sisa TA/Skripsi', key: 'tagihanTaSkripsisSisa', width: 18 },
  { header: 'Sisa Biaya Lain', key: 'tagihanBiayaLainSisa', width: 18 },
  { header: 'Tunggakan Lain (Manual)', key: 'tunggakanManual', width: 22 },
  { header: 'Total Tunggakan', key: 'totalTunggakan', width: 18 },
];

const LABEL_LAINNYA = 'Lainnya (non-semester)';

/**
 * Baris export per mahasiswa per tahun akademik (bisa difilter TA & prodi di Excel). Tanpa filter TA:
 * - sisa tagihan kuliah di baris periodenya;
 * - bila tagihan TERBARU membawa kolom Tunggakan dari import, angka itu mewakili semester sebelumnya:
 *   ditaruh di baris terbaru dan baris periode lama mahasiswa tsb tidak ditampilkan (tidak dobel);
 * - TA/Skripsi, biaya lain & tunggakan manual (tidak terikat periode) di baris "Lainnya".
 * Jumlah semua baris satu mahasiswa = total tunggakannya.
 */
const buildExportRowsPerPeriode = async ({ tahunAjaranId, kodeProdi } = {}) => {
  if (tahunAjaranId) {
    const ta = await TahunAjaran.findByPk(tahunAjaranId, { attributes: ['nama', 'jenisSemester'] });
    const label = ta ? `${ta.nama} ${ta.jenisSemester}` : '-';
    const tagihan = await TagihanKuliah.findAll({ where: { tahunAjaranId }, attributes: ['mahasiswaId', 'semester'], raw: true });
    const semesterBy = new Map(tagihan.map((t) => [t.mahasiswaId, t.semester]));
    const rows = await listTunggakanMahasiswa({ tahunAjaranId, kodeProdi });
    return rows.map((r) => ({ ...r, tahunAkademik: label, semester: semesterBy.get(r.mahasiswaId) ?? '-', tunggakanImport: 0 }));
  }

  const [tagihanList, manualList, taSkripsiMap, biayaLainMap] = await Promise.all([
    TagihanKuliah.findAll({
      include: [
        { model: Mahasiswa, as: 'mahasiswa', include: [{ model: Jurusan, as: 'jurusan' }] },
        { model: PembayaranKuliah, as: 'pembayaranList' },
        { model: TahunAjaran, as: 'tahunAjaran', attributes: ['id', 'nama', 'tahunMulai', 'jenisSemester'], required: false },
      ],
    }),
    TunggakanMahasiswa.findAll({ include: [{ model: Mahasiswa, as: 'mahasiswa', include: [{ model: Jurusan, as: 'jurusan' }] }] }),
    buildSisaTaSkripsiMap(),
    buildSisaBiayaLainMap(),
  ]);

  const identitas = new Map();
  const simpanIdentitas = (m) => {
    if (m && !identitas.has(m.id)) {
      identitas.set(m.id, { mahasiswaId: m.id, nim: m.nim, namaLengkap: m.namaLengkap, prodi: m.jurusan?.namaJurusan ?? '-', kodeProdi: m.jurusan?.kodeProdi ?? null });
    }
  };
  const rows = [];
  const kosong = { tagihanSisa: 0, tunggakanImport: 0, tagihanTaSkripsisSisa: 0, tagihanBiayaLainSisa: 0, tunggakanManual: 0 };

  const byMahasiswa = new Map();
  tagihanList.forEach((t) => {
    if (!t.mahasiswa) return;
    simpanIdentitas(t.mahasiswa);
    byMahasiswa.set(t.mahasiswaId, [...(byMahasiswa.get(t.mahasiswaId) ?? []), t]);
  });
  byMahasiswa.forEach((list, mahasiswaId) => {
    const urut = [...list].sort((a, b) => urutanPeriode(a) - urutanPeriode(b));
    const terbaru = urut[urut.length - 1];
    const ringkasan = ringkasanKewajibanMahasiswa(urut);
    const pakaiTunggakanImport = hitungSaldoTagihan(terbaru).tunggakan > 0;
    (pakaiTunggakanImport ? [terbaru] : urut).forEach((t) => {
      const saldo = hitungSaldoTagihan(t);
      const tunggakanImport = t === terbaru && pakaiTunggakanImport ? ringkasan.tunggakan : 0;
      if (saldo.sisaSemester <= 0 && tunggakanImport <= 0) return;
      rows.push({
        ...identitas.get(mahasiswaId),
        ...kosong,
        tahunAkademik: t.tahunAjaran ? `${t.tahunAjaran.nama} ${t.tahunAjaran.jenisSemester}` : '-',
        semester: t.semester,
        _urutan: urutanPeriode(t),
        tagihanSisa: saldo.sisaSemester,
        tunggakanImport,
      });
    });
  });

  // Komponen non-semester per mahasiswa.
  const lainnya = new Map();
  const tambahLain = (mahasiswaId, key, nilai) => {
    if (!nilai) return;
    if (!lainnya.has(mahasiswaId)) lainnya.set(mahasiswaId, { ...kosong });
    lainnya.get(mahasiswaId)[key] += nilai;
  };
  manualList.forEach((r) => {
    simpanIdentitas(r.mahasiswa);
    tambahLain(r.mahasiswaId, 'tunggakanManual', Number(r.nominal) || 0);
  });
  taSkripsiMap.forEach((sisa, id) => tambahLain(id, 'tagihanTaSkripsisSisa', sisa));
  biayaLainMap.forEach((sisa, id) => tambahLain(id, 'tagihanBiayaLainSisa', sisa));
  const kurangIdentitas = [...lainnya.keys()].filter((id) => !identitas.has(id));
  if (kurangIdentitas.length) {
    (await Mahasiswa.findAll({ where: { id: kurangIdentitas }, include: [{ model: Jurusan, as: 'jurusan' }] })).forEach(simpanIdentitas);
  }
  lainnya.forEach((nilai, mahasiswaId) => {
    if (!identitas.has(mahasiswaId)) return;
    rows.push({ ...identitas.get(mahasiswaId), ...nilai, tahunAkademik: LABEL_LAINNYA, semester: '-', _urutan: Number.MAX_SAFE_INTEGER });
  });

  return rows
    .filter((r) => !kodeProdi || r.kodeProdi === kodeProdi)
    .map((r) => ({
      ...r,
      totalTunggakan: r.tagihanSisa + r.tunggakanImport + r.tagihanTaSkripsisSisa + r.tagihanBiayaLainSisa + r.tunggakanManual,
    }))
    .filter((r) => r.totalTunggakan > 0)
    .sort((a, b) => a.prodi.localeCompare(b.prodi) || a.nim.localeCompare(b.nim) || a._urutan - b._urutan)
    .map(({ _urutan, ...r }) => r);
};

/** Export detail tunggakan per mahasiswa per tahun akademik, dengan autofilter untuk TA & prodi. */
const exportTunggakanPerMahasiswa = async ({ tahunAjaranId, kodeProdi } = {}) => {
  const rows = await buildExportRowsPerPeriode({ tahunAjaranId, kodeProdi });
  const workbook = buildWorkbook('Tunggakan per Mahasiswa', TUNGGAKAN_MAHASISWA_EXPORT_COLUMNS, rows);
  const sheet = workbook.worksheets[0];
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: TUNGGAKAN_MAHASISWA_EXPORT_COLUMNS.length } };
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  TUNGGAKAN_MAHASISWA_EXPORT_COLUMNS.forEach((c, i) => {
    if (i >= 5) sheet.getColumn(i + 1).numFmt = '#,##0';
  });
  return workbook;
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
const buildTunggakanPerJurusan = async (tahunAjaranId, kodeProdi) => {
  const rows = await listTunggakanMahasiswa({ tahunAjaranId, kodeProdi });

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
const exportTunggakanPerJurusan = async ({ tahunAjaranId, kodeProdi } = {}) => {
  const data = await buildTunggakanPerJurusan(tahunAjaranId, kodeProdi);
  return buildWorkbook('Tunggakan per Jurusan', TUNGGAKAN_JURUSAN_EXPORT_COLUMNS, data);
};

module.exports = {
  getRingkasanTunggakanMahasiswa,
  getRingkasanTunggakanBatch,
  listTunggakanMahasiswa,
  listBebasTunggakan,
  listLaporanUangKuliah,
  listLaporanSertifikasi,
  listTunggakanPerJurusan,
  exportTunggakanPerMahasiswa,
  exportTunggakanPerJurusan,
};
