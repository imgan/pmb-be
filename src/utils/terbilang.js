const SATUAN = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];

const baca = (n) => {
  if (n < 12) return SATUAN[n];
  if (n < 20) return `${baca(n - 10)} belas`;
  if (n < 100) return `${baca(Math.floor(n / 10))} puluh ${baca(n % 10)}`;
  if (n < 200) return `seratus ${baca(n - 100)}`;
  if (n < 1000) return `${baca(Math.floor(n / 100))} ratus ${baca(n % 100)}`;
  if (n < 2000) return `seribu ${baca(n - 1000)}`;
  if (n < 1e6) return `${baca(Math.floor(n / 1000))} ribu ${baca(n % 1000)}`;
  if (n < 1e9) return `${baca(Math.floor(n / 1e6))} juta ${baca(n % 1e6)}`;
  if (n < 1e12) return `${baca(Math.floor(n / 1e9))} miliar ${baca(n % 1e9)}`;
  return `${baca(Math.floor(n / 1e12))} triliun ${baca(n % 1e12)}`;
};

/** 1250000 -> "Satu Juta Dua Ratus Lima Puluh Ribu Rupiah" (dibulatkan ke rupiah). */
const terbilangRupiah = (value) => {
  const n = Math.round(Math.abs(Number(value) || 0));
  const kata = n === 0 ? 'nol' : baca(n);
  const kalimat = `${kata} rupiah`.replace(/\s+/g, ' ').trim();
  return kalimat.replace(/\b\w/g, (c) => c.toUpperCase());
};

module.exports = { terbilangRupiah };
