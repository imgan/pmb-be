/**
 * Normalisasi nomor HP Indonesia ke format lokal angka saja: "+62 812-3456-789" / "62812..." / "0812..." → "0812...".
 * Dipakai untuk login PMB dengan nomor HP & password awal peserta. Kosong / bukan angka → ''.
 */
const normalisasiHp = (nilai) => {
  const angka = String(nilai ?? '').replace(/\D/g, '');
  if (!angka) return '';
  if (angka.startsWith('62')) return `0${angka.slice(2)}`;
  if (angka.startsWith('8')) return `0${angka}`;
  return angka;
};

/** Ekspresi SQL kolom nomor HP yang sudah dibersihkan dari spasi, tanda hubung, titik, plus, dan kurung. */
const sqlHpBersih = (kolom) => `REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(${kolom}, ' ', ''), '-', ''), '.', ''), '+', ''), '(', ''), ')', '')`;

/** Bentuk-bentuk nomor yang setara di database: 0812..., 62812..., 812... */
const variasiHp = (nilai) => {
  const lokal = normalisasiHp(nilai);
  if (!lokal) return [];
  const tanpaNol = lokal.replace(/^0/, '');
  return [...new Set([lokal, `62${tanpaNol}`, tanpaNol])];
};

module.exports = { normalisasiHp, sqlHpBersih, variasiHp };
