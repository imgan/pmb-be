/**
 * Kompres gambar unggahan (data URL) di server dengan sharp:
 * - diputar sesuai EXIF (foto HP), diperkecil maks. 1920 px (tidak diperbesar);
 * - tanpa transparansi → JPEG q80 (mozjpeg); dengan transparansi → WebP q80; GIF (bisa animasi) tidak diubah;
 * - hasil dipakai hanya bila lebih kecil dari aslinya.
 * Thumbnail sampul: JPEG 320 px. sharp dimuat opsional — bila gagal dimuat di server, gambar disimpan apa adanya.
 */
let sharp = null;
try {
  // eslint-disable-next-line global-require
  sharp = require('sharp');
} catch {
  sharp = null;
}

const SISI_MAKS = 1920;
const SISI_THUMB = 320;

const pecah = (dataUrl) => {
  const m = /^data:([^;,]*)?;base64,/.exec(String(dataUrl));
  return m ? { tipe: m[1] || '', buffer: Buffer.from(String(dataUrl).slice(m[0].length), 'base64') } : null;
};
const keDataUrl = (tipe, buffer) => `data:${tipe};base64,${buffer.toString('base64')}`;
const gantiEkstensi = (nama, ekstensi) => `${String(nama).replace(/\.[^./\\]+$/, '') || 'gambar'}.${ekstensi}`;

/** Kembalikan { data, tipe, ukuran, nama, thumb } — data/nama/tipe asli bila tidak bisa / tidak perlu dikompres. */
const kompresGambar = async (dataUrl, nama) => {
  const asli = pecah(dataUrl);
  const hasilAsli = { data: dataUrl, tipe: asli?.tipe || null, ukuran: asli?.buffer.length ?? 0, nama, thumb: null };
  if (!sharp || !asli) return hasilAsli;
  try {
    const gambar = sharp(asli.buffer, { failOn: 'none' }).rotate();
    const meta = await gambar.metadata();
    const thumb = await sharp(asli.buffer, { failOn: 'none' })
      .rotate()
      .resize(SISI_THUMB, SISI_THUMB, { fit: 'inside', withoutEnlargement: true })
      .flatten({ background: '#ffffff' })
      .jpeg({ quality: 70, mozjpeg: true })
      .toBuffer();
    const hasilThumb = keDataUrl('image/jpeg', thumb);
    if (meta.format === 'gif') return { ...hasilAsli, thumb: hasilThumb };

    const diperkecil = gambar.resize(SISI_MAKS, SISI_MAKS, { fit: 'inside', withoutEnlargement: true });
    const [buffer, tipe, ekstensi] = meta.hasAlpha
      ? [await diperkecil.webp({ quality: 80 }).toBuffer(), 'image/webp', 'webp']
      : [await diperkecil.jpeg({ quality: 80, mozjpeg: true }).toBuffer(), 'image/jpeg', 'jpg'];
    if (buffer.length >= asli.buffer.length) return { ...hasilAsli, thumb: hasilThumb };
    return { data: keDataUrl(tipe, buffer), tipe, ukuran: buffer.length, nama: gantiEkstensi(nama, ekstensi), thumb: hasilThumb };
  } catch {
    // File rusak / format tidak dikenal sharp: simpan apa adanya.
    return hasilAsli;
  }
};

module.exports = { kompresGambar, sharpTersedia: () => !!sharp };
