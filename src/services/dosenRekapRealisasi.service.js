const { Op, fn, col } = require('sequelize');
const { JadwalKuliah, KehadiranDosen, Dosen } = require('../models');

/**
 * Portal dosen — Rekap Realisasi: daftar kelas yang diampu dosen (koordinator atau pengampu)
 * beserta jumlah realisasi mengajar per status, mengikuti menu BAAK "Cetak Realisasi Mengajar".
 * Hanya realisasi milik dosen yang login yang dihitung.
 */

const TARGET_PERTEMUAN = 16;
const HARI_LABEL = { SENIN: 'Senin', SELASA: 'Selasa', RABU: 'Rabu', KAMIS: 'Kamis', JUMAT: 'Jumat', SABTU: 'Sabtu', MINGGU: 'Minggu' };

const formatHariJam = (jadwal) => {
  const hari = (jadwal.hari ?? []).map((h) => HARI_LABEL[h] ?? h).join(', ');
  return [hari, jadwal.jam ? `Jam ke-${jadwal.jam}` : null].filter(Boolean).join(' / ') || '-';
};
const namaDosen = (d) => (d ? [d.namaLengkap, d.gelar].filter(Boolean).join(', ') : null);

const listRekapRealisasi = async (dosenId, tahunAjaranId = null) => {
  const pengampu = '$dosenPengampu.id$';
  const jadwalList = await JadwalKuliah.findAll({
    where: {
      [Op.or]: [{ dosenKordinatorId: dosenId }, { [pengampu]: dosenId }],
      ...(tahunAjaranId ? { tahunAjaranId } : {}),
    },
    include: [
      { model: Dosen, as: 'dosenPengampu', attributes: [], through: { attributes: [] }, required: false },
      { model: Dosen.unscoped(), as: 'dosenKordinator', attributes: ['id', 'namaLengkap', 'gelar'], required: false },
    ],
    order: [['kelas', 'ASC'], ['namaMataKuliah', 'ASC']],
    subQuery: false,
  });
  const unik = [...new Map(jadwalList.map((j) => [j.id, j])).values()];
  const ids = unik.map((j) => j.id);

  const counts = ids.length
    ? await KehadiranDosen.findAll({
        attributes: ['jadwalKuliahId', 'status', [fn('COUNT', col('id')), 'total'], [fn('MAX', col('tanggal_realisasi')), 'terakhir']],
        where: { jadwalKuliahId: { [Op.in]: ids }, dosenId },
        group: ['jadwalKuliahId', 'status'],
        raw: true,
      })
    : [];

  return unik.map((j) => {
    const rows = counts.filter((c) => c.jadwalKuliahId === j.id);
    const jumlah = (status) => Number(rows.find((c) => c.status === status)?.total ?? 0);
    const hadir = jumlah('HADIR');
    const terakhir = rows.map((r) => r.terakhir).filter(Boolean).sort().pop() ?? null;
    return {
      id: j.id,
      hariJam: formatHariJam(j),
      kelas: j.kelas,
      kodeMataKuliah: j.kodeMataKuliah,
      namaMataKuliah: j.namaMataKuliah,
      sks: j.sks,
      dosenKordinator: namaDosen(j.dosenKordinator),
      peran: j.dosenKordinatorId === dosenId ? 'Koordinator' : 'Pengampu',
      jam: j.jam,
      ruangan: j.ruangan,
      hadir,
      izin: jumlah('IZIN'),
      sakit: jumlah('SAKIT'),
      tidakHadir: jumlah('TIDAK_HADIR'),
      realisasiTerakhir: terakhir,
      persen: Math.round((hadir / TARGET_PERTEMUAN) * 1000) / 10,
    };
  });
};

module.exports = { listRekapRealisasi, TARGET_PERTEMUAN };
