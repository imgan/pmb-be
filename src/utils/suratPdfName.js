/**
 * Penamaan PDF surat: NAMA_SURAT_NIM (mis. FORMULIR_PENDAFTARAN_SIDANG_TA_484012610003).
 * Dipakai untuk nama file unduhan (Content-Disposition) sekaligus judul dokumen PDF, supaya
 * judul tab viewer PDF sama dengan nama filenya.
 */
const NAMA_SURAT_FILE = {
  AKTIF_KULIAH: 'SURAT_KETERANGAN_AKTIF_KULIAH',
  LULUS_MENUNGGU_IJAZAH: 'SURAT_KETERANGAN_LULUS_MENUNGGU_IJAZAH',
  OBSERVASI: 'SURAT_OBSERVASI',
  KKP: 'SURAT_KULIAH_KERJA_PRAKTEK',
  REKOMENDASI_KAMPUS_MERDEKA: 'SURAT_REKOMENDASI_KAMPUS_MERDEKA',
  UJIAN_UAS: 'SURAT_KETERANGAN_UJIAN_UAS',
  DAFTAR_SIDANG_TA: 'FORMULIR_PENDAFTARAN_SIDANG_TA',
  REKAP_NILAI_SIDANG: 'REKAPITULASI_NILAI_SIDANG',
  JURNAL_KONSULTASI_TA: 'JURNAL_KONSULTASI_TA',
};
const suratPdfBaseName = (data) =>
  `${NAMA_SURAT_FILE[data.surat.jenisSurat] ?? 'SURAT_KETERANGAN'}_${data.mahasiswa.nim}`;
const suratPdfFilename = (data) => `${suratPdfBaseName(data)}.pdf`;

/** Opsi PDFDocument standar surat (A4, margin 56) + metadata judul. */
const suratPdfDocOptions = (data) => ({
  size: 'A4',
  margin: 56,
  bufferPages: true,
  info: { Title: suratPdfBaseName(data) },
});

module.exports = { suratPdfBaseName, suratPdfFilename, suratPdfDocOptions };
