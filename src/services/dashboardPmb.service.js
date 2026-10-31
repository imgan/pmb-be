const { Peserta, PesertaBiodata, SumberInformasi, Beasiswa, TahunPmb, TargetPmb, sequelize } = require('../models');
const ApiError = require('../utils/ApiError');
const tahunModulService = require('./tahunModul.service');
const { listProdi } = require('./academicContext.service');

const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const labelTahun = (t) => `${t.nama} ${t.jenisSemester}`;

/** Nama sekolah/wilayah dikelompokkan tanpa beda huruf besar/spasi; label = penulisan yang paling sering dipakai. */
const hitungNormal = (items, ambil) => {
  const grup = new Map();
  items.forEach((it) => {
    const asli = String(ambil(it) ?? '').trim().replace(/\s+/g, ' ');
    if (!/[a-z0-9]/i.test(asli)) return;
    const k = asli.toLowerCase();
    const g = grup.get(k) ?? { jumlah: 0, ejaan: new Map() };
    g.jumlah += 1;
    g.ejaan.set(asli, (g.ejaan.get(asli) ?? 0) + 1);
    grup.set(k, g);
  });
  return [...grup.values()]
    .map((g) => ({ label: [...g.ejaan.entries()].sort((a, b) => b[1] - a[1])[0][0], jumlah: g.jumlah }))
    .sort((a, b) => b.jumlah - a.jumlah);
};

/** Deret bulanan dari bulan pendaftar pertama s/d bulan terakhir (atau bulan ini untuk tahun aktif), maks 24 bulan. */
const trendBulanan = (rows, sampaiSekarang) => {
  if (!rows.length) return [];
  const kunci = (d) => d.getFullYear() * 12 + d.getMonth();
  const tanggal = rows.map((p) => new Date(p.createdAt));
  let akhir = Math.max(...tanggal.map(kunci));
  if (sampaiSekarang) akhir = Math.max(akhir, kunci(new Date()));
  const awal = Math.max(Math.min(...tanggal.map(kunci)), akhir - 23);
  const jumlah = new Map();
  tanggal.forEach((d) => jumlah.set(kunci(d), (jumlah.get(kunci(d)) ?? 0) + 1));
  const hasil = [];
  for (let k = awal; k <= akhir; k += 1) {
    const tahun = Math.floor(k / 12);
    hasil.push({ label: `${BULAN[k % 12]} ${String(tahun).slice(2)}`, jumlah: jumlah.get(k) ?? 0 });
  }
  return hasil;
};

/**
 * Data dashboard PMB untuk satu tahun ajaran PMB (default: tahun PMB aktif; 'semua' = seluruh peserta).
 * Progres pencapaian prodi = peserta berstatus kelulusan "diterima", dibandingkan target_pmb tahun tsb.
 */
const getDashboard = async ({ tahunPmbId } = {}) => {
  const tahunList = await TahunPmb.findAll({ order: [['tahunMulai', 'DESC'], ['jenisSemester', 'DESC']] });
  const semua = tahunPmbId === 'semua';
  let tahun = null;
  if (!semua) {
    tahun = tahunPmbId ? tahunList.find((t) => t.id === Number(tahunPmbId)) : await tahunModulService.aktif('pmb');
    if (tahunPmbId && !tahun) throw new ApiError(404, 'Tahun ajaran PMB tidak ditemukan');
  }

  const rows = await Peserta.findAll({
    where: tahun ? { tahunPmbId: tahun.id } : {},
    attributes: ['id', 'asalSekolah', 'jurusanId', 'sumberInformasiId', 'beasiswaId', 'statusUjian', 'statusKelulusan', 'createdAt'],
    include: [
      { model: PesertaBiodata, as: 'biodata', attributes: ['nik', 'jenisKelamin', 'kabupaten'], required: false },
    ],
  });

  const [prodiList, sumberList, beasiswaList, targetRows] = await Promise.all([
    listProdi(),
    SumberInformasi.findAll({ attributes: ['id', 'namaInformasi'], order: [['id', 'ASC']] }),
    Beasiswa.findAll({ attributes: ['id', 'namaBeasiswa', 'isActive'], order: [['orderNumber', 'ASC'], ['id', 'ASC']] }),
    tahun ? TargetPmb.findAll({ where: { tahunPmbId: tahun.id } }) : [],
  ]);

  const targetByKode = new Map(targetRows.map((t) => [t.kodeProdi, t.target]));
  const pencapaian = prodiList
    .map((p) => {
      const milikProdi = rows.filter((r) => p.jurusanIds.includes(r.jurusanId));
      return {
        kodeProdi: p.kodeProdi,
        nama: p.nama,
        pendaftar: milikProdi.length,
        diterima: milikProdi.filter((r) => r.statusKelulusan === 'diterima').length,
        target: targetByKode.get(p.kodeProdi) ?? null,
      };
    })
    .sort((a, b) => b.diterima - a.diterima || b.pendaftar - a.pendaftar || a.nama.localeCompare(b.nama));

  const perId = (list, kolom, nama) =>
    list.map((x) => ({ id: x.id, label: x[nama], jumlah: rows.filter((r) => r[kolom] === x.id).length }));
  const jalur = [
    ...perId(beasiswaList, 'beasiswaId', 'namaBeasiswa').filter((j) => j.jumlah > 0 || beasiswaList.find((b) => b.id === j.id).isActive),
    { id: null, label: 'Pembiayaan Mandiri', jumlah: rows.filter((r) => !r.beasiswaId).length },
  ];
  const sumberInformasi = perId(sumberList, 'sumberInformasiId', 'namaInformasi');
  const belumIsiSumber = rows.filter((r) => !r.sumberInformasiId).length;

  // Biodata pribadi terisi (NIK ada); biodata bisa berisi data pendidikan saja.
  const denganBiodata = rows.filter((r) => r.biodata?.nik);
  const gender = [
    { label: 'Laki-laki', jumlah: denganBiodata.filter((r) => r.biodata.jenisKelamin === 'L').length },
    { label: 'Perempuan', jumlah: denganBiodata.filter((r) => r.biodata.jenisKelamin === 'P').length },
  ];

  return {
    tahunPmb: tahun ? { id: tahun.id, label: labelTahun(tahun), isActive: tahun.isActive } : null,
    tahunList: tahunList.map((t) => ({ id: t.id, label: labelTahun(t), isActive: t.isActive })),
    ringkasan: {
      pendaftar: rows.length,
      siapTes: rows.filter((r) => r.biodata?.nik && r.statusUjian === 'belum_ujian').length,
      lulusSeleksi: rows.filter((r) => r.statusUjian === 'lulus').length,
      diterima: rows.filter((r) => r.statusKelulusan === 'diterima').length,
    },
    trend: trendBulanan(rows, !!tahun?.isActive),
    pencapaian,
    jalur,
    sumberInformasi,
    belumIsiSumber,
    topSekolah: hitungNormal(rows, (r) => r.asalSekolah).slice(0, 6),
    wilayah: hitungNormal(denganBiodata, (r) => r.biodata.kabupaten).slice(0, 8),
    gender,
    belumIsiBiodata: rows.length - denganBiodata.length,
  };
};

/** Simpan target per prodi untuk satu tahun PMB; target kosong/0 menghapus target prodi tsb. */
const saveTarget = async ({ tahunPmbId, items }, actorId) => {
  const tahun = await TahunPmb.findByPk(tahunPmbId);
  if (!tahun) throw new ApiError(404, 'Tahun ajaran PMB tidak ditemukan');
  const kodeValid = new Set((await listProdi()).map((p) => p.kodeProdi));
  const salah = items.find((it) => !kodeValid.has(it.kodeProdi));
  if (salah) throw new ApiError(400, `Kode prodi ${salah.kodeProdi} tidak dikenal`);

  await sequelize.transaction(async (transaction) => {
    for (const { kodeProdi, target } of items) {
      const existing = await TargetPmb.findOne({ where: { tahunPmbId, kodeProdi }, transaction });
      if (!target) {
        if (existing) await existing.destroy({ transaction });
      } else if (existing) {
        await existing.update({ target, updatedBy: actorId }, { transaction });
      } else {
        await TargetPmb.create({ tahunPmbId, kodeProdi, target, createdBy: actorId, updatedBy: actorId }, { transaction });
      }
    }
  });
};

module.exports = { getDashboard, saveTarget };
