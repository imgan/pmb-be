/**
 * Saldo tagihan kuliah (sistem tagihan berbasis import). Satu sumber aturan untuk semua modul
 * (cekal akademik, kasir, laporan, portal mahasiswa):
 *
 * - totalDibayar = totalBayarImport (posisi bayar menurut file keuangan saat import)
 *                  + transaksi kasir (pembayaran_kuliah) yang DICATAT SETELAH importedAt.
 *   Transaksi sebelum import dianggap sudah termasuk di Total Bayar file, jadi tidak dihitung dua kali.
 * - sisaSemester = totalTagihan - totalDibayar (min 0)
 * - tunggakan    = utang semester sebelumnya dari file import, TERPISAH dari sisa semester ini.
 * - totalKewajiban = sisaSemester + tunggakan
 *
 * `tagihan` boleh instance Sequelize atau objek polos, dengan `pembayaranList` ter-include.
 */
const num = (v) => Number(v) || 0;

const transaksiTerhitung = (tagihan) => {
  const list = tagihan.pembayaranList ?? [];
  if (!tagihan.importedAt) return list;
  const batas = new Date(tagihan.importedAt).getTime();
  return list.filter((p) => new Date(p.createdAt).getTime() > batas);
};

const hitungSaldoTagihan = (tagihan) => {
  const totalTagihan = Math.max(num(tagihan.totalTagihan), 0);
  const dibayarImport = num(tagihan.totalBayarImport);
  const dibayarTransaksi = transaksiTerhitung(tagihan).reduce((sum, p) => sum + num(p.nominal), 0);
  const totalDibayar = dibayarImport + dibayarTransaksi;
  const sisaSemester = Math.max(totalTagihan - totalDibayar, 0);
  const tunggakan = Math.max(num(tagihan.tunggakan), 0);
  let status = 'BELUM_BAYAR';
  if (sisaSemester <= 0) status = 'LUNAS';
  else if (totalDibayar > 0) status = 'SEBAGIAN';
  return {
    totalTagihan,
    dibayarImport,
    dibayarTransaksi,
    totalDibayar,
    sisaSemester,
    tunggakan,
    totalKewajiban: sisaSemester + tunggakan,
    status,
  };
};

/** Urutan periode: tahun mulai lalu GANJIL < GENAP (fallback id tagihan bila tahunAjaran tidak ter-include). */
const urutanPeriode = (t) => {
  const ta = t.tahunAjaran;
  if (!ta) return t.id;
  const tahun = Number(ta.tahunMulai) || Number(String(ta.nama ?? '').slice(0, 4)) || 0;
  return tahun * 10 + (ta.jenisSemester === 'GENAP' ? 2 : 1);
};

/**
 * Kewajiban satu mahasiswa dari seluruh tagihannya.
 * - Bila kolom Tunggakan pada tagihan TERBARU diisi file keuangan, angka itu mewakili utang semua
 *   semester sebelumnya: sisa tagihan lama TIDAK dijumlahkan lagi; hanya transaksi kasir atas tagihan
 *   lama yang dicatat setelah import terbaru yang mengurangi tunggakan tersebut.
 * - Bila kolom Tunggakan kosong (file per semester tanpa kolom Tunggakan), tunggakan = jumlah sisa
 *   tagihan semester-semester SEBELUMNYA (otomatis, ikut berkurang bila dibayar di kasir).
 */
const ringkasanKewajibanMahasiswa = (tagihanList) => {
  if (!tagihanList?.length) return { terbaru: null, sisaSemester: 0, tunggakan: 0, totalKewajiban: 0 };
  const urut = [...tagihanList].sort((a, b) => urutanPeriode(a) - urutanPeriode(b));
  const terbaru = urut[urut.length - 1];
  const saldo = hitungSaldoTagihan(terbaru);
  const batas = terbaru.importedAt ? new Date(terbaru.importedAt).getTime() : 0;
  const bayarTagihanLama = urut
    .slice(0, -1)
    .flatMap((t) => t.pembayaranList ?? [])
    .filter((p) => new Date(p.createdAt).getTime() > batas)
    .reduce((sum, p) => sum + num(p.nominal), 0);
  const tunggakan =
    saldo.tunggakan > 0
      ? Math.max(saldo.tunggakan - bayarTagihanLama, 0)
      : urut.slice(0, -1).reduce((sum, t) => sum + hitungSaldoTagihan(t).sisaSemester, 0);
  return { terbaru, sisaSemester: saldo.sisaSemester, tunggakan, totalKewajiban: saldo.sisaSemester + tunggakan };
};

module.exports = { hitungSaldoTagihan, transaksiTerhitung, ringkasanKewajibanMahasiswa, urutanPeriode };
