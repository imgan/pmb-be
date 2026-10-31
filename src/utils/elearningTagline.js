/** Tagline konten e-learning: array teks (disimpan JSON). Nilai lama berupa teks tunggal tetap dibaca. */
const parseTagline = (v) => {
  if (!v) return [];
  try {
    const a = JSON.parse(v);
    return Array.isArray(a) ? a.filter(Boolean).map(String) : [String(a)];
  } catch {
    return [String(v)];
  }
};

/** Normalisasi input tagline (array / string): trim, buang kosong & duplikat (tanpa membedakan huruf), maks. 5. */
const bersihkanTagline = (v) => {
  const list = (Array.isArray(v) ? v : v ? [v] : []).map((t) => String(t ?? '').trim()).filter(Boolean);
  const unik = [];
  list.forEach((t) => {
    if (!unik.some((u) => u.toLowerCase() === t.toLowerCase())) unik.push(t);
  });
  return unik.slice(0, 5);
};

module.exports = { parseTagline, bersihkanTagline };
