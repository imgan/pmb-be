const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

/**
 * Kontak yang diubah lewat form biodata (mahasiswa_biodata.hp / .email) disalin ke tabel mahasiswa
 * (noTelepon / email) — itu yang dibaca dashboard, daftar mahasiswa, dan login email. Email yang
 * kosong/tidak valid tidak disalin (email login wajib & harus valid).
 */
const kontakMahasiswaDariBiodata = (payload) => {
  const out = {};
  if (payload.hp !== undefined) out.noTelepon = payload.hp ? String(payload.hp).trim().slice(0, 20) : null;
  const email = typeof payload.email === 'string' ? payload.email.trim() : '';
  if (email && isEmail(email)) out.email = email.slice(0, 100);
  return out;
};

module.exports = { kontakMahasiswaDariBiodata };
