const { CalonMahasiswa, DokumenKelengkapan, PesertaDokumen } = require('../models');

/**
 * Status kelengkapan dokumen per peserta (menu Peserta):
 *  - umum     : semua Dokumen Pendaftaran (dokumen kelengkapan non-beasiswa) sudah diupload
 *  - beasiswa : semua Dokumen Pendaftaran 2 (dokumen kelengkapan khusus beasiswa) sudah diupload
 * Jenis dokumen yang belum ada di master dianggap belum lengkap.
 * @returns {Promise<Map<number, { umum: boolean, beasiswa: boolean }>>}
 */
const hitungStatusDokumen = async (pesertaIds) => {
  const ids = [...new Set(pesertaIds.filter(Boolean).map(Number))];
  const hasil = new Map();
  if (!ids.length) return hasil;

  const [jenis, uploads] = await Promise.all([
    DokumenKelengkapan.findAll({ attributes: ['id', 'isBeasiswa'] }),
    PesertaDokumen.findAll({ where: { pesertaId: ids }, attributes: ['pesertaId', 'dokumenKelengkapanId'] }),
  ]);
  const umumIds = jenis.filter((j) => !j.isBeasiswa).map((j) => j.id);
  const beasiswaIds = jenis.filter((j) => j.isBeasiswa).map((j) => j.id);

  const uploadPerPeserta = new Map();
  uploads.forEach((u) => {
    if (!uploadPerPeserta.has(u.pesertaId)) uploadPerPeserta.set(u.pesertaId, new Set());
    uploadPerPeserta.get(u.pesertaId).add(u.dokumenKelengkapanId);
  });
  const lengkap = (daftar, sudah) => daftar.length > 0 && daftar.every((id) => sudah.has(id));

  ids.forEach((id) => {
    const sudah = uploadPerPeserta.get(id) ?? new Set();
    hasil.set(id, { umum: lengkap(umumIds, sudah), beasiswa: lengkap(beasiswaIds, sudah) });
  });
  return hasil;
};

/**
 * Kolom Formulir Pendaftaran = Dokumen Pendaftaran lengkap; Kelengkapan Persyaratan = Dokumen Pendaftaran 2 (beasiswa)
 * lengkap — untuk jalur mandiri dokumen beasiswa tidak berlaku, jadi ikut Dokumen Pendaftaran.
 */
const flagDokumen = (status, skemaPembiayaan) => ({
  formulirPendaftaran: status.umum,
  kelengkapanPersyaratan: skemaPembiayaan === 'beasiswa' ? status.beasiswa : status.umum,
});

/**
 * Simpan flag turunan ke kolom asli baris CalonMahasiswa milik peserta (dipanggil saat upload/hapus dokumen dan saat
 * baris disimpan) supaya sorting & query agregat yang membaca kolom langsung tetap akurat.
 */
const syncFlagDokumen = async (pesertaId) => {
  if (!pesertaId) return;
  const status = (await hitungStatusDokumen([pesertaId])).get(Number(pesertaId));
  const rows = await CalonMahasiswa.findAll({ where: { pesertaId }, attributes: ['id', 'skemaPembiayaan'] });
  await Promise.all(rows.map((r) => r.update(flagDokumen(status, r.skemaPembiayaan))));
};

module.exports = { hitungStatusDokumen, flagDokumen, syncFlagDokumen };
