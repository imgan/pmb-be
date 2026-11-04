const { BatasTagihanAkademik, Jurusan, GolonganKelas, Keringanan, Mahasiswa, TagihanKuliah, PembayaranKuliah } = require('../models');
const { hitungSaldoTagihan } = require('../utils/tagihanSaldo');
const ApiError = require('../utils/ApiError');
// Semester tagihan berjalan = padanan Tahun Ajaran Keuangan aktif (Modul Admin › Tahun (Kasir & Keuangan)), bukan tahun akademik.
const { padananTahunAjaran } = require('./tahunModul.service');
const { getRingkasanTunggakanMahasiswa, getRingkasanTunggakanBatch } = require('./laporanKeuangan.service');

const DEFAULT_CONFIG = {
  krsAktif: false,
  minBayarKrs: 0,
  utsAktif: false,
  minBayarUts: 0,
  nilaiAktif: false,
  minBayarNilai: 0,
};

const toConfig = (row) =>
  row
    ? {
        krsAktif: row.krsAktif,
        minBayarKrs: row.minBayarKrs,
        utsAktif: row.utsAktif,
        minBayarUts: row.minBayarUts,
        nilaiAktif: row.nilaiAktif,
        minBayarNilai: row.minBayarNilai,
        updatedAt: row.updatedAt,
      }
    : { ...DEFAULT_CONFIG, updatedAt: null };

/** Semua prodi (jurusan aktif), masing-masing dengan konfigurasi batasnya — prodi yang belum diatur = filter nonaktif. */
const listPerProdi = async () => {
  const [jurusanList, configList] = await Promise.all([
    Jurusan.findAll({ include: [{ model: GolonganKelas, as: 'golonganKelas', required: false }], order: [['namaJurusan', 'ASC']] }),
    BatasTagihanAkademik.findAll(),
  ]);
  const configByJurusan = new Map(configList.map((c) => [c.jurusanId, c]));
  return jurusanList.map((j) => ({
    jurusanId: j.id,
    namaJurusan: j.namaJurusan,
    golonganKelas: j.golonganKelas?.namaKelas ?? null,
    ...toConfig(configByJurusan.get(j.id)),
  }));
};

const upsertByJurusan = async (jurusanId, payload, actorId) => {
  const jurusan = await Jurusan.findByPk(jurusanId);
  if (!jurusan) throw new ApiError(404, 'Prodi tidak ditemukan');
  const existing = await BatasTagihanAkademik.findOne({ where: { jurusanId } });
  if (existing) await existing.update({ ...payload, updatedBy: actorId });
  else await BatasTagihanAkademik.create({ ...DEFAULT_CONFIG, ...payload, jurusanId, createdBy: actorId, updatedBy: actorId });
  return (await listPerProdi()).find((r) => r.jurusanId === Number(jurusanId));
};

// berlaku = kolom keringanan yang menentukan apakah keringanan dihitung untuk syarat ini.
const JENIS = {
  krs: { aktif: 'krsAktif', minBayar: 'minBayarKrs', berlaku: 'berlakuKrs', label: 'mengisi KRS' },
  uts: { aktif: 'utsAktif', minBayar: 'minBayarUts', berlaku: 'berlakuUts', label: 'mengikuti UTS' },
  nilai: { aktif: 'nilaiAktif', minBayar: 'minBayarNilai', berlaku: 'berlakuUas', label: 'melihat nilai, mencetak KHS & daftar nilai sementara' },
};

const formatRupiah = (n) => `Rp ${Math.round(n).toLocaleString('id-ID')}`;
const formatPersen = (n) => `${Number(n.toFixed(2)).toLocaleString('id-ID')}%`;

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/**
 * Total "nilai yang akan dibayar" dari keringanan DISETUJUI yang masih berlaku hari ini, per syarat
 * (krs/uts/nilai). Keringanan yang sudah lewat "sampai tanggal" tidak dihitung lagi, sehingga syarat
 * pembayaran kembali seperti semula. Nominal dikurangkan dari tunggakan saat cek cekal.
 */
const getTotalKeringanan = async (mahasiswaId) => {
  const rows = await Keringanan.findAll({
    where: { mahasiswaId, status: 'DISETUJUI' },
    attributes: ['jumlahBayar', 'berlakuKrs', 'berlakuUts', 'berlakuUas', 'sampaiTanggal'],
  });
  return hitungTotalKeringanan(rows);
};

const hitungTotalKeringanan = (rows) => {
  const hariIni = todayIso();
  const total = { krs: 0, uts: 0, nilai: 0 };
  rows
    .filter((row) => !row.sampaiTanggal || String(row.sampaiTanggal).slice(0, 10) >= hariIni)
    .forEach((row) => {
      Object.entries(JENIS).forEach(([jenis, { berlaku }]) => {
        if (row[berlaku]) total[jenis] += row.jumlahBayar ?? 0;
      });
    });
  return total;
};

// Tagihan satu semester dicicil 6x (1 cicilan per bulan selama semester berjalan).
const JUMLAH_CICILAN = 6;

/**
 * Bulan ke-berapa (1..6) dari semester tahun ajaran pada tanggal `now`, sesuai periode cicilan
 * Keuangan: GANJIL = September (tahun mulai) s/d Februari, GENAP = Maret (tahun selesai) s/d Agustus.
 * Contoh 2026/2027 Ganjil: September = ke-1, Oktober = ke-2, ..., Februari = ke-6.
 * Sebelum semester mulai = 1, sesudah semester berakhir = 6.
 */
const bulanKeSemester = (tahunAjaran, now = new Date()) => {
  const mulai = tahunAjaran.jenisSemester === 'GENAP' ? new Date(tahunAjaran.tahunSelesai, 2, 1) : new Date(tahunAjaran.tahunMulai, 8, 1);
  const selisih = (now.getFullYear() - mulai.getFullYear()) * 12 + (now.getMonth() - mulai.getMonth()) + 1;
  return Math.min(Math.max(selisih, 1), JUMLAH_CICILAN);
};

/**
 * Status akses akademik mahasiswa (alur cekal), dihitung dari tagihan SEMESTER BERJALAN (tahun
 * ajaran aktif) yang dicicil 6x per bulan:
 * - KRS   : sudah membayar >= minBayarKrs% tagihan semester (15% ≈ 1 bulan)
 * - UTS   : sudah membayar >= minBayarUts% tagihan semester (50% = 3 bulan)
 * - Nilai : sudah membayar >= minBayarNilai% dari cicilan yang jatuh tempo s/d bulan berjalan
 *           (mis. bulan ke-3 -> cicilan bulan 1–3 lunas)
 * Tunggakan lain (semester sebelumnya, biaya lain, tunggakan manual) harus lunas untuk
 * ketiganya; keringanan disetujui mengurangi tunggakan lain dulu, sisanya dihitung sebagai bayar
 * semester berjalan. Tagihan TA/Skripsi & wisuda TIDAK ikut dihitung (lihat getRingkasanTunggakanBatch).
 */
const getAksesMahasiswa = async (mahasiswa) => {
  const config = toConfig(await BatasTagihanAkademik.findOne({ where: { jurusanId: mahasiswa.jurusanId } }));
  const perluHitung = config.krsAktif || config.utsAktif || config.nilaiAktif;
  const tahunAjaran = await padananTahunAjaran('keuangan');
  if (!perluHitung) return hitungAkses({ config, tahunAjaran });

  const [ringkasan, keringananPerJenis, tagihanList] = await Promise.all([
    getRingkasanTunggakanMahasiswa(mahasiswa.id),
    getTotalKeringanan(mahasiswa.id),
    tahunAjaran
      ? TagihanKuliah.findAll({
          where: { mahasiswaId: mahasiswa.id, tahunAjaranId: tahunAjaran.id },
          include: [{ model: PembayaranKuliah, as: 'pembayaranList' }],
        })
      : [],
  ]);
  return hitungAkses({ config, tahunAjaran, ringkasan, keringananPerJenis, tagihanList });
};

/** Perhitungan murni (tanpa query) — dipakai getAksesMahasiswa dan listStatusMahasiswa (batch). */
const hitungAkses = ({
  config,
  tahunAjaran,
  ringkasan = { totalTunggakan: 0, totalKewajiban: 0 },
  keringananPerJenis = { krs: 0, uts: 0, nilai: 0 },
  tagihanList = [],
}) => {
  const { totalTunggakan, totalKewajiban } = ringkasan;
  let tagihanSemester = 0;
  let dibayarSemester = 0;
  tagihanList.forEach((t) => {
    const saldo = hitungSaldoTagihan(t);
    tagihanSemester += saldo.totalTagihan;
    dibayarSemester += Math.min(saldo.totalDibayar, saldo.totalTagihan);
  });

  const sisaSemester = Math.max(tagihanSemester - dibayarSemester, 0);
  const tunggakanLain = Math.max(totalTunggakan - sisaSemester, 0);
  // Keringanan mengurangi tunggakan lain dulu, sisanya dihitung sebagai bayar semester berjalan —
  // dihitung per syarat karena keringanan bisa berlaku hanya untuk KRS / UTS / UAS tertentu.
  const efektif = (keringanan) => {
    const tunggakanLainEf = Math.max(tunggakanLain - keringanan, 0);
    const dibayarEf = Math.min(dibayarSemester + Math.max(keringanan - tunggakanLain, 0), tagihanSemester);
    return { tunggakanLain: tunggakanLainEf, dibayar: dibayarEf };
  };
  const efektifPerJenis = Object.fromEntries(Object.keys(JENIS).map((j) => [j, efektif(keringananPerJenis[j])]));
  // Ringkasan umum (dashboard/daftar) memakai keringanan terbesar yang sedang berlaku.
  const keringanan = Math.max(...Object.values(keringananPerJenis));
  const { tunggakanLain: tunggakanLainEfektif, dibayar: dibayarEfektif } = efektif(keringanan);
  const tunggakanEfektif = tunggakanLainEfektif + Math.max(tagihanSemester - dibayarEfektif, 0);
  const persenDibayar = tagihanSemester > 0 ? (dibayarEfektif / tagihanSemester) * 100 : 100;
  const cicilanPerBulan = tagihanSemester / JUMLAH_CICILAN;
  const bulanKe = tahunAjaran ? bulanKeSemester(tahunAjaran) : JUMLAH_CICILAN;
  const jatuhTempo = cicilanPerBulan * bulanKe;

  const target = {
    krs: (config.minBayarKrs / 100) * tagihanSemester,
    uts: (config.minBayarUts / 100) * tagihanSemester,
    nilai: (config.minBayarNilai / 100) * jatuhTempo,
  };
  const syaratText = {
    krs: `minimal ${formatPersen(config.minBayarKrs)} tagihan semester ini`,
    uts: `minimal ${formatPersen(config.minBayarUts)} tagihan semester ini`,
    nilai: `cicilan s/d bulan ke-${bulanKe} dari ${JUMLAH_CICILAN}`,
  };

  const status = (jenis) => {
    const { aktif, minBayar, label } = JENIS[jenis];
    const { tunggakanLain: tunggakanLainJenis, dibayar: dibayarJenis } = efektifPerJenis[jenis];
    // Target dibulatkan ke rupiah (cicilan bisa pecahan, mis. 5.000.000 / 6).
    const kurang = Math.max(Math.round(target[jenis]) - dibayarJenis, 0);
    const diizinkan = !config[aktif] || (tunggakanLainJenis <= 0 && kurang <= 0);
    let pesan = null;
    if (!diizinkan) {
      const alasan = [];
      if (tunggakanLainJenis > 0) alasan.push(`masih ada tunggakan sebelumnya/lainnya ${formatRupiah(tunggakanLainJenis)}`);
      if (kurang > 0) {
        alasan.push(
          `pembayaran semester ini ${formatRupiah(dibayarJenis)} dari ${formatRupiah(tagihanSemester)}, ` +
            `wajib ${formatRupiah(target[jenis])} (${syaratText[jenis]}) — kurang ${formatRupiah(kurang)}`
        );
      }
      pesan = `Anda belum dapat ${label}: ${alasan.join('; ')}. Silakan selesaikan pembayaran atau hubungi Bagian Keuangan.`;
    }
    return {
      aktif: config[aktif],
      minBayar: config[minBayar],
      target: Math.round(target[jenis]),
      keringanan: keringananPerJenis[jenis],
      diizinkan,
      pesan,
    };
  };

  return {
    tahunAjaranId: tahunAjaran?.id ?? null,
    totalTunggakan,
    totalKewajiban,
    keringanan,
    tunggakanEfektif,
    tunggakanLain: tunggakanLainEfektif,
    tagihanSemester,
    dibayarSemester: dibayarEfektif,
    persenDibayar,
    persenTunggakan: 100 - persenDibayar,
    jumlahCicilan: JUMLAH_CICILAN,
    cicilanPerBulan: Math.round(cicilanPerBulan),
    bulanKe,
    krs: status('krs'),
    uts: status('uts'),
    nilai: status('nilai'),
  };
};

/** Lempar 403 bila mahasiswa tidak boleh mengakses fitur `jenis` ('krs' | 'uts' | 'nilai'). */
const assertAksesMahasiswa = async (mahasiswa, jenis) => {
  const akses = await getAksesMahasiswa(mahasiswa);
  if (!akses[jenis].diizinkan) throw new ApiError(403, akses[jenis].pesan);
};

/**
 * Status cekal semua mahasiswa aktif pada satu prodi (semua baris jurusan dengan kode prodi sama).
 * `jenis` (krs|uts|nilai) + `status` (cekal|boleh) menyaring hasil.
 */
const listStatusMahasiswa = async ({ jurusanId, jenis, status, search }) => {
  if (!jurusanId) throw new ApiError(400, 'Pilih prodi');
  const jurusan = await Jurusan.findByPk(jurusanId);
  if (!jurusan) throw new ApiError(404, 'Prodi tidak ditemukan');
  const sameProdi = jurusan.kodeProdi
    ? (await Jurusan.findAll({ where: { kodeProdi: jurusan.kodeProdi }, attributes: ['id'] })).map((j) => j.id)
    : [jurusan.id];
  const mahasiswaList = await Mahasiswa.findAll({
    where: { jurusanId: sameProdi, isActive: true },
    attributes: ['id', 'nim', 'namaLengkap', 'jurusanId', 'tahunMasuk'],
    order: [['nim', 'ASC']],
  });

  // Semua data dimuat sekali untuk seluruh mahasiswa prodi (bukan query per mahasiswa — ratusan
  // mahasiswa x ±10 query membuat request timeout).
  const ids = mahasiswaList.map((m) => m.id);
  const [configList, tahunAjaran] = await Promise.all([
    BatasTagihanAkademik.findAll({ where: { jurusanId: sameProdi } }),
    padananTahunAjaran('keuangan'),
  ]);
  const configByJurusan = new Map(configList.map((c) => [c.jurusanId, toConfig(c)]));
  const configOf = (m) => configByJurusan.get(m.jurusanId) ?? toConfig(null);
  const perluIds = mahasiswaList
    .filter((m) => {
      const c = configOf(m);
      return c.krsAktif || c.utsAktif || c.nilaiAktif;
    })
    .map((m) => m.id);
  const [ringkasanMap, keringananList, tagihanList] = perluIds.length
    ? await Promise.all([
        getRingkasanTunggakanBatch(perluIds),
        Keringanan.findAll({
          where: { mahasiswaId: perluIds, status: 'DISETUJUI' },
          attributes: ['mahasiswaId', 'jumlahBayar', 'berlakuKrs', 'berlakuUts', 'berlakuUas', 'sampaiTanggal'],
        }),
        tahunAjaran
          ? TagihanKuliah.findAll({
              where: { mahasiswaId: perluIds, tahunAjaranId: tahunAjaran.id },
              include: [{ model: PembayaranKuliah, as: 'pembayaranList' }],
            })
          : [],
      ])
    : [new Map(), [], []];
  const groupBy = (list) => {
    const map = new Map();
    list.forEach((row) => map.set(row.mahasiswaId, [...(map.get(row.mahasiswaId) ?? []), row]));
    return map;
  };
  const keringananByMahasiswa = groupBy(keringananList);
  const tagihanByMahasiswa = groupBy(tagihanList);
  const perluSet = new Set(perluIds);

  const rows = [];
  for (const m of mahasiswaList) {
    const akses = perluSet.has(m.id)
      ? hitungAkses({
          config: configOf(m),
          tahunAjaran,
          ringkasan: ringkasanMap.get(m.id),
          keringananPerJenis: hitungTotalKeringanan(keringananByMahasiswa.get(m.id) ?? []),
          tagihanList: tagihanByMahasiswa.get(m.id) ?? [],
        })
      : hitungAkses({ config: configOf(m), tahunAjaran });
    rows.push({
      mahasiswaId: m.id,
      nim: m.nim,
      namaLengkap: m.namaLengkap,
      angkatan: m.tahunMasuk,
      tagihanSemester: akses.tagihanSemester,
      dibayarSemester: akses.dibayarSemester,
      tunggakanLain: akses.tunggakanLain,
      persenDibayar: akses.tagihanSemester > 0 ? Math.round(akses.persenDibayar * 100) / 100 : null,
      krs: akses.krs.diizinkan,
      uts: akses.uts.diizinkan,
      nilai: akses.nilai.diizinkan,
    });
  }

  const q = (search ?? '').trim().toLowerCase();
  return rows.filter((r) => {
    if (q && !`${r.nim} ${r.namaLengkap}`.toLowerCase().includes(q)) return false;
    if (JENIS[jenis] && status === 'cekal') return !r[jenis];
    if (JENIS[jenis] && status === 'boleh') return r[jenis];
    return true;
  });
};

module.exports = { listPerProdi, upsertByJurusan, getAksesMahasiswa, assertAksesMahasiswa, listStatusMahasiswa };
