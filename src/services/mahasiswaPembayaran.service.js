const { TagihanKuliah, TagihanCicilan, PembayaranKuliah, TahunAjaran, Mahasiswa, Jurusan, User } = require('../models');
const ApiError = require('../utils/ApiError');
const { formatTahunAjaran } = require('../utils/tahunAjaran');
const { hitungSaldoTagihan, ringkasanKewajibanMahasiswa, transaksiTerhitung } = require('../utils/tagihanSaldo');
const { alokasiCicilan } = require('../utils/tagihanCicilan');
const { listVaMahasiswa, pilihVaAktif } = require('./virtualAccountMahasiswa.service');

/**
 * Riwayat pembayaran kuliah untuk portal mahasiswa: per tagihan semester (rincian biaya, total
 * dibayar, sisa) beserta daftar pembayarannya. Hanya data milik mahasiswa yang login.
 */

const nomorKwitansi = (p) => {
  const tahun = String(p.tanggalBayar ?? '').slice(0, 4) || new Date().getFullYear();
  return `KWT/PK/${tahun}/${String(p.id).padStart(6, '0')}`;
};

const STATUS_PORTAL = { LUNAS: 'LUNAS', SEBAGIAN: 'BELUM_LUNAS', BELUM_BAYAR: 'BELUM_BAYAR' };

const urutBayar = (a, b) => String(a.tanggalBayar).localeCompare(String(b.tanggalBayar)) || a.id - b.id;

const listPembayaranKuliah = async (mahasiswaId) => {
  const tagihanList = await TagihanKuliah.findAll({
    where: { mahasiswaId },
    include: [
      { model: TahunAjaran, as: 'tahunAjaran', attributes: ['id', 'nama', 'tahunMulai', 'jenisSemester'], required: false },
      { model: PembayaranKuliah, as: 'pembayaranList', required: false },
      { model: TagihanCicilan, as: 'cicilanList', required: false },
    ],
    order: [['semester', 'DESC']],
  });
  const kewajiban = ringkasanKewajibanMahasiswa(tagihanList);
  const vaAktif = pilihVaAktif(await listVaMahasiswa(mahasiswaId));

  const data = tagihanList.map((t) => {
    const pembayaran = [...(t.pembayaranList ?? [])].sort(urutBayar);
    const saldo = hitungSaldoTagihan(t);
    return {
      id: t.id,
      semester: t.semester,
      tahunAjaran: formatTahunAjaran(t.tahunAjaran),
      sksDiambil: t.sksDiambil,
      hargaPerSks: t.hargaPerSks,
      biayaSks: t.biayaSks,
      biayaBpp: t.biayaBpp,
      biayaSpp: t.biayaSpp,
      potongan: t.potongan,
      totalTagihan: saldo.totalTagihan,
      totalDibayar: saldo.totalDibayar,
      dibayarImport: saldo.dibayarImport,
      sisaTagihan: saldo.sisaSemester,
      tunggakan: saldo.tunggakan,
      tanggalJatuhTempo: t.tanggalJatuhTempo,
      noVirtualAccount: t.noVirtualAccount,
      status: STATUS_PORTAL[saldo.status],
      // Cicilan bulanan (kosong = dibayar sekaligus): status per cicilan dari total dibayar, FIFO.
      cicilan: alokasiCicilan(t.cicilanList, saldo.totalDibayar).map((c) => ({
        cicilanKe: c.cicilanKe,
        periode: c.periode,
        nominal: c.nominal,
        dibayar: c.dibayar,
        sisa: c.sisa,
        tanggalJatuhTempo: c.tanggalJatuhTempo,
        noVirtualAccount: c.noVirtualAccount,
        status: STATUS_PORTAL[c.status],
        terlambat: c.terlambat,
      })),
      pembayaran: [...pembayaran].reverse().map((p) => ({
        id: p.id,
        nomorKwitansi: nomorKwitansi(p),
        tanggalBayar: p.tanggalBayar,
        noBukti: p.noBukti,
        nominal: Number(p.nominal),
        kodeBank: p.kodeBank,
        keterangan: p.keterangan,
      })),
    };
  });

  // Ringkasan memakai tagihan terbaru: tunggakannya sudah mewakili semester sebelumnya.
  const terbaru = kewajiban.terbaru ? data.find((t) => t.id === kewajiban.terbaru.id) : null;
  const ringkasan = {
    totalTagihan: terbaru?.totalTagihan ?? 0,
    totalDibayar: terbaru?.totalDibayar ?? 0,
    sisaTagihan: kewajiban.sisaSemester,
    tunggakan: kewajiban.tunggakan,
    totalKewajiban: kewajiban.totalKewajiban,
    // Sumber utama: VA hasil Import VA yang berlaku hari ini (atau terdekat akan dibuka). Kalau belum
    // ada, VA tagihan terbaru / VA terakhir yang pernah diisi (data sudah urut semester DESC).
    vaAktif: vaAktif
      ? {
          noVirtualAccount: vaAktif.noVirtualAccount,
          periodeOpen: vaAktif.periodeOpen,
          periodeClose: vaAktif.periodeClose,
          nominal: vaAktif.nominal,
          status: vaAktif.status,
        }
      : null,
    noVirtualAccount:
      vaAktif?.noVirtualAccount ?? terbaru?.noVirtualAccount ?? data.find((t) => t.noVirtualAccount)?.noVirtualAccount ?? null,
  };

  return { ringkasan, tagihan: data };
};

/**
 * Data kwitansi satu pembayaran. `mahasiswaId` diisi dari portal mahasiswa (ditolak bila bukan
 * miliknya); `null` dipakai kasir (modul Keuangan) yang boleh mencetak kwitansi mahasiswa mana pun.
 */
const getKwitansiData = async (mahasiswaId, pembayaranId) => {
  const pembayaran = await PembayaranKuliah.findByPk(pembayaranId, {
    include: [
      {
        model: TagihanKuliah,
        as: 'tagihan',
        required: true,
        include: [
          { model: TahunAjaran, as: 'tahunAjaran', attributes: ['nama', 'jenisSemester'], required: false },
          { model: PembayaranKuliah, as: 'pembayaranList', required: false },
        ],
      },
      { model: User, as: 'creator', attributes: ['name'], required: false },
    ],
  });
  if (!pembayaran || (mahasiswaId != null && pembayaran.tagihan.mahasiswaId !== mahasiswaId)) {
    throw new ApiError(404, 'Pembayaran tidak ditemukan');
  }

  const mahasiswa = await Mahasiswa.findByPk(pembayaran.tagihan.mahasiswaId, {
    attributes: ['id', 'nim', 'namaLengkap'],
    include: [{ model: Jurusan, as: 'jurusan', attributes: ['namaJurusan'], required: false }],
  });

  const { tagihan } = pembayaran;
  // Akumulasi s.d. pembayaran ini (bukan s.d. hari ini), supaya kwitansi lama tetap sama isinya.
  const sampaiIni = [...(tagihan.pembayaranList ?? [])].sort(urutBayar);
  const idx = sampaiIni.findIndex((p) => p.id === pembayaran.id);
  const terhitung = new Set(transaksiTerhitung(tagihan).map((p) => p.id));
  const dibayarSampaiIni =
    (terhitung.has(pembayaran.id) ? Number(tagihan.totalBayarImport) || 0 : 0) +
    sampaiIni
      .slice(0, idx + 1)
      .filter((p) => !terhitung.has(pembayaran.id) || terhitung.has(p.id))
      .reduce((sum, p) => sum + Number(p.nominal), 0);
  const totalTagihan = Math.max(Number(tagihan.totalTagihan), 0);

  return {
    nomorKwitansi: nomorKwitansi(pembayaran),
    tanggalBayar: pembayaran.tanggalBayar,
    noBukti: pembayaran.noBukti,
    nominal: Number(pembayaran.nominal),
    kodeBank: pembayaran.kodeBank,
    keterangan: pembayaran.keterangan,
    petugas: pembayaran.creator?.name ?? null,
    mahasiswa: { nim: mahasiswa.nim, namaLengkap: mahasiswa.namaLengkap, prodi: mahasiswa.jurusan?.namaJurusan ?? '-' },
    tagihan: {
      semester: tagihan.semester,
      tahunAjaran: formatTahunAjaran(tagihan.tahunAjaran),
      totalTagihan,
      dibayarSampaiIni,
      sisaSetelahIni: Math.max(totalTagihan - dibayarSampaiIni, 0),
      pembayaranKe: idx + 1,
    },
  };
};

module.exports = { listPembayaranKuliah, getKwitansiData };
