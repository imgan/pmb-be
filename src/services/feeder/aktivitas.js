const { Op } = require('sequelize');
const {
  Mahasiswa,
  Jurusan,
  Dosen,
  TahunAjaran,
  JadwalSidang,
  PendaftarSidang,
  BimbinganMagang,
  PembimbingMagang,
  PembimbingAkademik,
  FeederAktivitas,
  FeederAktivitasPeserta,
  FeederAktivitasDosen,
} = require('../../models');
const { periodeFromTahunAjaran, periodeFromDate } = require('./helpers');

/**
 * Menu Feeder "Aktivitas Mahasiswa" + peserta + dosen pembimbing/penguji, dibagi 3 kategori:
 *  - TA  : tugas akhir / bimbingan (menu tanpa akhiran), sumber generate = Pendaftar Sidang
 *  - KKP : kerja praktek, sumber generate = Bimbingan Magang
 *  - PA  : bimbingan akademis, sumber generate = Pembimbing Akademik
 * Ketiganya memakai tabel yang sama (feeder_aktivitas*) dan dibedakan lewat kolom kategori.
 */

const GROUP = 'Aktivitas';

const KATEGORI = {
  TA: {
    suffix: '',
    judulMenu: 'Bimbingan',
    menuSuffix: 'TA',
    jenisOptions: [
      { value: '2', label: '2 - Tugas Akhir' },
      { value: '1', label: '1 - Laporan Akhir Studi' },
      { value: '3', label: '3 - Tesis' },
      { value: '4', label: '4 - Disertasi' },
    ],
  },
  KKP: {
    suffix: ' KKP',
    judulMenu: 'KKP',
    menuSuffix: 'KKP',
    jenisOptions: [
      { value: '6', label: '6 - Kerja Praktek / PKL' },
      { value: '5', label: '5 - Kuliah Kerja Nyata' },
      { value: '13', label: '13 - Magang / Praktik Kerja' },
    ],
  },
  PA: {
    suffix: ' PA',
    judulMenu: 'PA',
    menuSuffix: 'PA',
    jenisOptions: [{ value: '7', label: '7 - Bimbingan Akademis' }],
  },
};

const JENIS_ANGGOTA_OPTIONS = [
  { value: '0', label: '0 - Personal' },
  { value: '1', label: '1 - Kelompok' },
];
const JENIS_PERAN_OPTIONS = [
  { value: '3', label: '3 - Personal' },
  { value: '1', label: '1 - Ketua' },
  { value: '2', label: '2 - Anggota' },
];
const URUTAN_OPTIONS = [1, 2, 3].map((n) => ({ value: n, label: `Ke-${n}` }));

const optionLabel = (options, value) => options.find((o) => String(o.value) === String(value))?.label ?? value ?? '';
const likeAny = (paths, search) => ({ [Op.or]: paths.map((p) => ({ [p]: { [Op.like]: `%${search}%` } })) });

const loadJurusanOptions = async () => {
  const rows = await Jurusan.findAll({ attributes: ['id', 'kodeProdi', 'namaJurusan'], order: [['namaJurusan', 'ASC']] });
  return rows.map((j) => ({ value: j.id, label: `${j.kodeProdi ?? '-'} - ${j.namaJurusan}` }));
};

const aktivitasLabel = (a) => (a ? `[${a.periode}] ${a.judul}` : '');
const aktivitasColumns = [
  { key: 'periode', header: 'Semester' },
  { key: 'judul', header: 'Judul Aktivitas' },
];
const aktivitasCells = (r) => ({ periode: r.aktivitas?.periode ?? '', judul: r.aktivitas?.judul ?? '' });
const aktivitasInclude = (kategori) => ({
  model: FeederAktivitas,
  as: 'aktivitas',
  attributes: ['id', 'periode', 'judul', 'kategori'],
  required: true,
  where: { kategori },
});

// ---------------- Generate dari data akademik ----------------

/** Buat/perbarui aktivitas berdasarkan sourceKey + pastikan peserta & dosennya ada. */
const upsertAktivitas = async ({ sourceKey, values, peserta = [], dosen = [] }, actorId) => {
  let aktivitas = await FeederAktivitas.findOne({ where: { sourceKey } });
  const created = !aktivitas;
  if (aktivitas) await aktivitas.update({ ...values, updatedBy: actorId });
  else aktivitas = await FeederAktivitas.create({ ...values, sourceKey, createdBy: actorId, updatedBy: actorId });

  for (const p of peserta) {
    await FeederAktivitasPeserta.findOrCreate({
      where: { aktivitasId: aktivitas.id, mahasiswaId: p.mahasiswaId },
      defaults: { jenisPeran: p.jenisPeran, createdBy: actorId, updatedBy: actorId },
    });
  }
  for (const d of dosen.filter((x) => x.dosenId)) {
    await FeederAktivitasDosen.findOrCreate({
      where: { aktivitasId: aktivitas.id, dosenId: d.dosenId, peran: d.peran },
      defaults: { urutan: d.urutan, createdBy: actorId, updatedBy: actorId },
    });
  }
  return created;
};

const generateResult = (label, created, total) => ({
  message: total ? `${label}: ${created} aktivitas baru, ${total - created} diperbarui` : `${label}: tidak ada data sumber`,
});

const GENERATORS = {
  TA: {
    label: 'Generate dari Pendaftar Sidang',
    confirm: 'Buat/perbarui aktivitas Tugas Akhir dari data Pendaftar Sidang (beserta peserta, pembimbing & penguji)?',
    async run(actorId) {
      const list = await PendaftarSidang.findAll({
        include: [
          { model: Mahasiswa, as: 'mahasiswa', attributes: ['id', 'jurusanId'] },
          { model: JadwalSidang, as: 'jadwalSidang', include: [{ model: TahunAjaran, as: 'tahunAjaran' }] },
        ],
      });
      let created = 0;
      for (const p of list) {
        const isNew = await upsertAktivitas(
          {
            sourceKey: `SIDANG:${p.id}`,
            values: {
              kategori: 'TA',
              periode: periodeFromTahunAjaran(p.jadwalSidang?.tahunAjaran) || periodeFromDate(p.createdAt),
              jurusanId: p.mahasiswa?.jurusanId ?? null,
              jenisAktivitas: '2',
              judul: p.judul,
              jenisAnggota: '0',
            },
            peserta: [{ mahasiswaId: p.mahasiswaId, jenisPeran: '3' }],
            dosen: [
              { dosenId: p.pembimbing1Id, peran: 'PEMBIMBING', urutan: 1 },
              { dosenId: p.pembimbing2Id, peran: 'PEMBIMBING', urutan: 2 },
              { dosenId: p.jadwalSidang?.dosenPengujiId, peran: 'PENGUJI', urutan: 1 },
            ],
          },
          actorId
        );
        if (isNew) created += 1;
      }
      return generateResult('Tugas Akhir', created, list.length);
    },
  },
  KKP: {
    label: 'Generate dari Bimbingan Magang',
    confirm: 'Buat/perbarui aktivitas KKP dari data Bimbingan Magang (beserta peserta & pembimbing)?',
    async run(actorId) {
      const list = await BimbinganMagang.findAll({
        include: [
          { model: Mahasiswa, as: 'mahasiswa', attributes: ['id', 'jurusanId'] },
          { model: PembimbingMagang, as: 'pembimbingMagang' },
        ],
      });
      let created = 0;
      for (const b of list) {
        const isNew = await upsertAktivitas(
          {
            sourceKey: `MAGANG:${b.id}`,
            values: {
              kategori: 'KKP',
              periode: periodeFromDate(b.createdAt),
              jurusanId: b.mahasiswa?.jurusanId ?? null,
              jenisAktivitas: '6',
              judul: b.judul || 'Kerja Praktek',
              noSk: b.pembimbingMagang?.noSk ?? null,
              tanggalSk: b.pembimbingMagang?.tanggalSk ?? null,
              jenisAnggota: '0',
            },
            peserta: [{ mahasiswaId: b.mahasiswaId, jenisPeran: '3' }],
            dosen: [{ dosenId: b.pembimbingMagang?.dosenId, peran: 'PEMBIMBING', urutan: 1 }],
          },
          actorId
        );
        if (isNew) created += 1;
      }
      return generateResult('KKP', created, list.length);
    },
  },
  PA: {
    label: 'Generate dari Pembimbing Akademik',
    confirm:
      'Buat/perbarui aktivitas Bimbingan Akademis periode berjalan: satu aktivitas per dosen PA, pesertanya mahasiswa bimbingannya?',
    async run(actorId) {
      const periode = periodeFromDate(new Date());
      const list = await PembimbingAkademik.findAll({
        include: [
          { model: Dosen, as: 'dosen', attributes: ['id', 'namaLengkap'] },
          { model: Mahasiswa, as: 'mahasiswaList', attributes: ['id', 'jurusanId'] },
        ],
      });
      const withMahasiswa = list.filter((pa) => pa.mahasiswaList?.length);
      let created = 0;
      for (const pa of withMahasiswa) {
        const isNew = await upsertAktivitas(
          {
            sourceKey: `PA:${pa.id}:${periode}`,
            values: {
              kategori: 'PA',
              periode,
              jurusanId: pa.mahasiswaList[0].jurusanId ?? null,
              jenisAktivitas: '7',
              judul: `Bimbingan Akademik ${pa.dosen?.namaLengkap ?? ''}`.trim(),
              noSk: pa.noSk,
              tanggalSk: pa.tanggalSk,
              jenisAnggota: '1',
            },
            peserta: pa.mahasiswaList.map((m) => ({ mahasiswaId: m.id, jenisPeran: '2' })),
            dosen: [{ dosenId: pa.dosenId, peran: 'PEMBIMBING', urutan: 1 }],
          },
          actorId
        );
        if (isNew) created += 1;
      }
      return generateResult(`Bimbingan Akademis ${periode}`, created, withMahasiswa.length);
    },
  },
};

// ---------------- Definisi menu ----------------

const makeAktivitas = (kategori) => {
  const k = KATEGORI[kategori];
  return {
    key: `aktivitas-${kategori.toLowerCase()}`,
    title: `Aktivitas Mahasiswa ${k.judulMenu}`,
    group: GROUP,
    menuCode: `SIM_FEEDER_AKTIVITAS_${k.menuSuffix}_MANAGEMENT`,
    source: `Isi peserta & dosen lewat menu Peserta Aktivitas${k.suffix} dan Dosen Pembimbing${k.suffix}.`,
    columns: [
      { key: 'periode', header: 'Semester' },
      { key: 'kodeProdi', header: 'Kode Prodi' },
      { key: 'jenisAktivitas', header: 'Jenis Aktivitas' },
      { key: 'judul', header: 'Judul' },
      { key: 'lokasi', header: 'Lokasi' },
      { key: 'noSk', header: 'No SK Tugas' },
      { key: 'tanggalSk', header: 'Tanggal SK Tugas' },
      { key: 'jenisAnggota', header: 'Jenis Anggota' },
      { key: 'jumlahPeserta', header: 'Jumlah Peserta' },
      { key: 'keterangan', header: 'Keterangan' },
    ],
    crud: {
      model: FeederAktivitas,
      scope: { kategori },
      include: () => [
        { model: Jurusan, as: 'jurusan', attributes: ['kodeProdi'] },
        { model: FeederAktivitasPeserta, as: 'pesertaList', attributes: ['id'] },
      ],
      where: (search) => likeAny(['judul', 'periode', 'noSk'], search),
      order: [['periode', 'DESC'], ['id', 'DESC']],
      fields: [
        { key: 'periode', label: 'Periode (mis. 20261)', type: 'text', required: true, pattern: '^\\d{4}[123]$' },
        { key: 'jurusanId', label: 'Program Studi', type: 'select', loadOptions: loadJurusanOptions, required: true },
        { key: 'jenisAktivitas', label: 'Jenis Aktivitas', type: 'select', options: k.jenisOptions, required: true },
        { key: 'jenisAnggota', label: 'Jenis Anggota', type: 'select', options: JENIS_ANGGOTA_OPTIONS, required: true },
        { key: 'judul', label: 'Judul', type: 'textarea', required: true },
        { key: 'lokasi', label: 'Lokasi', type: 'text' },
        { key: 'noSk', label: 'No SK Tugas', type: 'text' },
        { key: 'tanggalSk', label: 'Tanggal SK Tugas', type: 'date' },
        { key: 'keterangan', label: 'Keterangan', type: 'textarea' },
      ],
      toRow: (r) => ({
        periode: r.periode,
        kodeProdi: r.jurusan?.kodeProdi ?? '',
        jenisAktivitas: optionLabel(k.jenisOptions, r.jenisAktivitas),
        judul: r.judul,
        lokasi: r.lokasi ?? '',
        noSk: r.noSk ?? '',
        tanggalSk: r.tanggalSk ?? '',
        jenisAnggota: optionLabel(JENIS_ANGGOTA_OPTIONS, r.jenisAnggota),
        jumlahPeserta: r.pesertaList?.length ?? 0,
        keterangan: r.keterangan ?? '',
      }),
    },
    actions: [{ key: 'generate', ...GENERATORS[kategori] }],
  };
};

const makePeserta = (kategori) => {
  const k = KATEGORI[kategori];
  return {
    key: `peserta-${kategori.toLowerCase()}`,
    title: `Peserta Aktivitas${k.suffix}`,
    group: GROUP,
    menuCode: `SIM_FEEDER_PESERTA_${k.menuSuffix}_MANAGEMENT`,
    source: `Mahasiswa peserta pada Aktivitas Mahasiswa ${k.judulMenu}.`,
    columns: [
      ...aktivitasColumns,
      { key: 'nim', header: 'NIM' },
      { key: 'nama', header: 'Nama' },
      { key: 'jenisPeran', header: 'Jenis Peran' },
    ],
    crud: {
      model: FeederAktivitasPeserta,
      include: () => [aktivitasInclude(kategori), { model: Mahasiswa, as: 'mahasiswa', attributes: ['id', 'nim', 'namaLengkap'] }],
      where: (search) => likeAny(['$mahasiswa.nim$', '$mahasiswa.nama_lengkap$', '$aktivitas.judul$'], search),
      fields: [
        { key: 'aktivitasId', label: 'Aktivitas', type: 'lookup', lookup: `aktivitas:${kategori}`, required: true },
        { key: 'mahasiswaId', label: 'Mahasiswa', type: 'lookup', lookup: 'mahasiswa', required: true },
        { key: 'jenisPeran', label: 'Jenis Peran', type: 'select', options: JENIS_PERAN_OPTIONS, required: true },
      ],
      toRow: (r) => ({
        ...aktivitasCells(r),
        nim: r.mahasiswa?.nim ?? '',
        nama: r.mahasiswa?.namaLengkap ?? '',
        jenisPeran: optionLabel(JENIS_PERAN_OPTIONS, r.jenisPeran),
      }),
      lookupLabels: (r) => ({
        aktivitasId: aktivitasLabel(r.aktivitas),
        mahasiswaId: r.mahasiswa ? `${r.mahasiswa.nim} - ${r.mahasiswa.namaLengkap}` : '',
      }),
      uniqueMessage: 'Mahasiswa ini sudah menjadi peserta aktivitas tersebut',
    },
  };
};

const makeDosen = (kategori, peran) => {
  const k = KATEGORI[kategori];
  const isPenguji = peran === 'PENGUJI';
  const namaPeran = isPenguji ? 'Penguji' : 'Pembimbing';
  return {
    key: `${namaPeran.toLowerCase()}-${kategori.toLowerCase()}`,
    title: `Dosen ${namaPeran}${k.suffix}`,
    group: GROUP,
    menuCode: `SIM_FEEDER_${peran}_${k.menuSuffix}_MANAGEMENT`,
    source: `Dosen ${namaPeran.toLowerCase()} pada Aktivitas Mahasiswa ${k.judulMenu}.`,
    columns: [
      ...aktivitasColumns,
      { key: 'nidn', header: 'NIDN' },
      { key: 'namaDosen', header: 'Nama Dosen' },
      { key: 'urutan', header: `${namaPeran} Ke` },
      { key: 'kategoriKegiatan', header: 'Kategori Kegiatan' },
    ],
    crud: {
      model: FeederAktivitasDosen,
      scope: { peran },
      include: () => [aktivitasInclude(kategori), { model: Dosen, as: 'dosen', attributes: ['id', 'nidn', 'namaLengkap'] }],
      where: (search) => likeAny(['$dosen.nidn$', '$dosen.nama_lengkap$', '$aktivitas.judul$'], search),
      fields: [
        { key: 'aktivitasId', label: 'Aktivitas', type: 'lookup', lookup: `aktivitas:${kategori}`, required: true },
        { key: 'dosenId', label: 'Dosen', type: 'lookup', lookup: 'dosen', required: true },
        { key: 'urutan', label: `${namaPeran} Ke`, type: 'select', options: URUTAN_OPTIONS, required: true },
        { key: 'kategoriKegiatan', label: 'Kode Kategori Kegiatan (Feeder)', type: 'text' },
      ],
      toRow: (r) => ({
        ...aktivitasCells(r),
        nidn: r.dosen?.nidn ?? '',
        namaDosen: r.dosen?.namaLengkap ?? '',
        urutan: r.urutan,
        kategoriKegiatan: r.kategoriKegiatan ?? '',
      }),
      lookupLabels: (r) => ({
        aktivitasId: aktivitasLabel(r.aktivitas),
        dosenId: r.dosen ? `${r.dosen.nidn} - ${r.dosen.namaLengkap}` : '',
      }),
      uniqueMessage: `Dosen ini sudah menjadi ${namaPeran.toLowerCase()} pada aktivitas tersebut`,
    },
  };
};

module.exports = [
  makeAktivitas('TA'),
  makePeserta('TA'),
  makeDosen('TA', 'PEMBIMBING'),
  makeDosen('TA', 'PENGUJI'),
  makeAktivitas('KKP'),
  makePeserta('KKP'),
  makeDosen('KKP', 'PEMBIMBING'),
  makeAktivitas('PA'),
  makePeserta('PA'),
  makeDosen('PA', 'PEMBIMBING'),
];
