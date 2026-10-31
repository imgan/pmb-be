/**
 * Aturan cicilan bulanan tagihan kuliah.
 *
 * Status cicilan TIDAK disimpan: total dibayar tagihan (lihat utils/tagihanSaldo.js) dialokasikan ke
 * cicilan berurutan dari cicilan ke-1 (FIFO). Jadi pembayaran lewat kasir maupun import otomatis
 * melunasi cicilan paling awal dulu, tanpa perlu memilih cicilan saat bayar.
 */
const num = (v) => Number(v) || 0;

/** Tanggal (YYYY-MM-DD) hari ini, zona lokal server. */
const hariIni = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/**
 * @param cicilanList daftar cicilan (instance / objek polos)
 * @param totalDibayar total dibayar tagihan induknya
 * @returns cicilan (objek polos, urut cicilanKe) + dibayar, sisa, status LUNAS | SEBAGIAN | BELUM_BAYAR,
 *          terlambat (belum lunas & lewat jatuh tempo)
 */
const alokasiCicilan = (cicilanList, totalDibayar) => {
  let saldo = Math.max(num(totalDibayar), 0);
  const today = hariIni();
  return [...(cicilanList ?? [])]
    .map((c) => (c.toJSON ? c.toJSON() : { ...c }))
    .sort((a, b) => a.cicilanKe - b.cicilanKe)
    .map((c) => {
      const nominal = num(c.nominal);
      const dibayar = Math.min(saldo, nominal);
      saldo -= dibayar;
      const sisa = nominal - dibayar;
      let status = 'BELUM_BAYAR';
      if (sisa <= 0) status = 'LUNAS';
      else if (dibayar > 0) status = 'SEBAGIAN';
      return { ...c, nominal, dibayar, sisa, status, terlambat: sisa > 0 && !!c.tanggalJatuhTempo && c.tanggalJatuhTempo < today };
    });
};

/** Ringkasan untuk daftar tagihan: jumlah cicilan, yang lunas, dan cicilan berikutnya yang harus dibayar. */
const ringkasanCicilan = (cicilanList, totalDibayar) => {
  const list = alokasiCicilan(cicilanList, totalDibayar);
  if (!list.length) return null;
  const berikutnya = list.find((c) => c.status !== 'LUNAS') ?? null;
  return {
    jumlah: list.length,
    lunas: list.filter((c) => c.status === 'LUNAS').length,
    berikutnya: berikutnya
      ? {
          cicilanKe: berikutnya.cicilanKe,
          periode: berikutnya.periode,
          sisa: berikutnya.sisa,
          tanggalJatuhTempo: berikutnya.tanggalJatuhTempo,
          noVirtualAccount: berikutnya.noVirtualAccount,
          terlambat: berikutnya.terlambat,
        }
      : null,
  };
};

/** Bagi total ke n cicilan sama rata (dibulatkan ke ribuan); selisih pembulatan masuk cicilan terakhir. */
const bagiRata = (total, n) => {
  const jumlah = Math.max(Math.floor(n), 1);
  const per = Math.floor(num(total) / jumlah / 1000) * 1000;
  return Array.from({ length: jumlah }, (_, i) => (i === jumlah - 1 ? num(total) - per * (jumlah - 1) : per));
};

/** 'YYYY-MM' + i bulan -> 'YYYY-MM-01'. */
const tambahBulan = (bulan, i) => {
  const [y, m] = String(bulan).split('-').map(Number);
  const d = new Date(y, m - 1 + i, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};

/** Tanggal jatuh tempo pada bulan periode (hari dibatasi ke akhir bulan). */
const jatuhTempoBulan = (periode, hari) => {
  if (!hari) return null;
  const [y, m] = periode.split('-').map(Number);
  const akhir = new Date(y, m, 0).getDate();
  return `${periode.slice(0, 8)}${String(Math.min(hari, akhir)).padStart(2, '0')}`;
};

module.exports = { alokasiCicilan, ringkasanCicilan, bagiRata, tambahBulan, jatuhTempoBulan };
