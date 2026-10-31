const { Op } = require('sequelize');
const {
  Mahasiswa,
  MahasiswaBiodata,
  Jurusan,
  Kurikulum,
  TahunAjaran,
  JadwalKuliah,
  MataKuliah,
  Dosen,
  Krs,
  KrsDetail,
  KehadiranDosen,
  NilaiMahasiswa,
  GolonganKelas,
  Yudisium,
  FeederAkm,
  FeederKelulusan,
  FeederNilaiTransfer,
} = require('../../models');
const { GRADE_BOBOT } = require('../../utils/gradeScale');
const { exportMahasiswa } = require('../mahasiswa.service');
const { exportMataKuliah } = require('../mataKuliah.service');
const {
  periodeFromTahunAjaran,
  periodeFromSemester,
  periodeFromDate,
  loadKodeProdiByKodeMk,
  kodeProdiKelas,
  paginateRows,
  round2,
} = require('./helpers');

const GROUP = 'Perkuliahan';

// ---- Kode Feeder ----
const STATUS_AKM_OPTIONS = [
  { value: 'A', label: 'A - Aktif' },
  { value: 'C', label: 'C - Cuti' },
  { value: 'N', label: 'N - Non Aktif' },
  { value: 'G', label: 'G - Sedang Double Degree' },
  { value: 'M', label: 'M - Kampus Merdeka' },
];
const JENIS_KELUAR_OPTIONS = [
  { value: '1', label: '1 - Lulus' },
  { value: '2', label: '2 - Mutasi' },
  { value: '3', label: '3 - Dikeluarkan' },
  { value: '4', label: '4 - Mengundurkan Diri' },
  { value: '5', label: '5 - Putus Sekolah' },
  { value: '6', label: '6 - Wafat' },
  { value: '7', label: '7 - Hilang' },
  { value: 'Z', label: 'Z - Lainnya' },
];
const NILAI_HURUF_OPTIONS = Object.keys(GRADE_BOBOT).map((g) => ({ value: g, label: g }));

const mahasiswaSearch = (search) =>
  search
    ? { [Op.or]: [{ nim: { [Op.like]: `%${search}%` } }, { namaLengkap: { [Op.like]: `%${search}%` } }] }
    : undefined;

// ================= Data dari tabel akademik (read-only + export) =================

const matakuliah = {
  key: 'matakuliah',
  title: 'Matakuliah',
  group: GROUP,
  menuCode: 'SIM_FEEDER_MATAKULIAH_MANAGEMENT',
  source: 'Data dari menu Kurikulum (Prodi) — mata kuliah tiap kurikulum. Tambah/ubah mata kuliah di sana.',
  columns: [
    { key: 'kodeMk', header: 'Kode MK' },
    { key: 'namaMk', header: 'Nama MK' },
    { key: 'sksTatapMuka', header: 'SKS Tatap Muka' },
    { key: 'sksPraktek', header: 'SKS Praktek' },
    { key: 'sksPrakLapangan', header: 'SKS Prak Lapangan' },
    { key: 'sksSimulasi', header: 'SKS Simulasi' },
    { key: 'semester', header: 'Semester' },
    { key: 'kurikulum', header: 'Kurikulum' },
    { key: 'wajib', header: 'Wajib' },
    { key: 'kodeProdi', header: 'Kode Prodi' },
  ],
  async list({ search, offset, limit }) {
    const rows = await MataKuliah.findAll({
      include: [
        {
          model: Kurikulum,
          as: 'kurikulum',
          required: false,
          include: [{ model: Jurusan, as: 'jurusan', required: false }],
        },
      ],
      order: [['kode', 'ASC']],
    });
    return paginateRows(
      rows.map((m) => ({
        id: m.id,
        kodeMk: m.kode,
        namaMk: m.mataKuliah,
        sksTatapMuka: m.sksTeori,
        sksPraktek: m.sksPraktek,
        sksPrakLapangan: m.sksLab,
        sksSimulasi: m.sksSimulasi,
        semester: m.semester ?? '',
        kurikulum: m.kurikulum?.tahunKurikulum ?? '',
        wajib: m.kelompokKurikulum === 'WAJIB' ? 'Ya' : m.kelompokKurikulum === 'PILIHAN' ? 'Tidak' : '',
        kodeProdi: m.kurikulum?.jurusan?.kodeProdi ?? '',
      })),
      { search, offset, limit }
    );
  },
  // Ekspor memakai format Neo Feeder lengkap yang sudah ada di modul Kurikulum.
  exportWorkbook: () => exportMataKuliah(),
};

const mahasiswa = {
  key: 'mahasiswa',
  title: 'Mahasiswa',
  group: GROUP,
  menuCode: 'SIM_FEEDER_MAHASISWA_MANAGEMENT',
  source: 'Data dari menu Mahasiswa & Biodata. Ekspor berisi seluruh kolom biodata format PDDIKTI.',
  columns: [
    { key: 'nim', header: 'NIM' },
    { key: 'nama', header: 'Nama' },
    { key: 'jenisKelamin', header: 'Jenis Kelamin' },
    { key: 'tempatLahir', header: 'Tempat Lahir' },
    { key: 'tanggalLahir', header: 'Tanggal Lahir' },
    { key: 'nik', header: 'NIK' },
    { key: 'kodeProdi', header: 'Kode Prodi' },
    { key: 'mulaiSemester', header: 'Mulai Semester' },
    { key: 'jenisPendaftaran', header: 'Jenis Pendaftaran' },
  ],
  filters: [
    {
      key: 'kodeProdi',
      label: 'Prodi',
      options: async () => {
        const rows = await Jurusan.findAll({ attributes: ['kodeProdi', 'namaJurusan'], where: { kodeProdi: { [Op.ne]: null } }, order: [['id', 'ASC']] });
        const seen = new Map();
        rows.forEach((j) => !seen.has(j.kodeProdi) && seen.set(j.kodeProdi, `${j.kodeProdi} - ${j.namaJurusan}`));
        return [...seen].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label));
      },
    },
    {
      key: 'tahunMasuk',
      label: 'Angkatan',
      options: async () => {
        const rows = await Mahasiswa.findAll({ attributes: ['tahunMasuk'], group: ['tahunMasuk'], order: [['tahunMasuk', 'DESC']], raw: true });
        return rows.filter((r) => r.tahunMasuk).map((r) => ({ value: String(r.tahunMasuk), label: `Angkatan ${r.tahunMasuk}` }));
      },
    },
  ],
  async list({ search, offset, limit, filters = {} }) {
    const where = { ...(mahasiswaSearch(search) ?? {}) };
    if (filters.tahunMasuk) where.tahunMasuk = Number(filters.tahunMasuk);
    if (filters.kodeProdi) where['$jurusan.kode_prodi$'] = filters.kodeProdi;
    const { rows, count } = await Mahasiswa.findAndCountAll({
      where,
      include: [
        { model: Jurusan, as: 'jurusan', attributes: ['kodeProdi'] },
        { model: MahasiswaBiodata, as: 'biodata', required: false },
      ],
      order: [['nim', 'ASC']],
      offset,
      limit,
      distinct: true,
    });
    return {
      count,
      rows: rows.map((m) => ({
        id: m.id,
        nim: m.nim,
        nama: m.namaLengkap,
        jenisKelamin: m.biodata?.jenisKelamin ?? '',
        tempatLahir: m.biodata?.tempatLahir ?? '',
        tanggalLahir: m.biodata?.tanggalLahir ?? '',
        nik: m.biodata?.noKtp ?? '',
        kodeProdi: m.jurusan?.kodeProdi ?? '',
        mulaiSemester: m.biodata?.mulaiSemester ?? `${m.tahunMasuk}1`,
        jenisPendaftaran: m.biodata?.jenisPendaftaran ?? '',
      })),
    };
  },
  exportWorkbook: (filters) => exportMahasiswa(filters),
};

const jadwalInclude = [
  { model: TahunAjaran, as: 'tahunAjaran', required: false },
  { model: MataKuliah, as: 'mataKuliah', required: false },
];

const kelas = {
  key: 'kelas',
  title: 'Kelas',
  group: GROUP,
  menuCode: 'SIM_FEEDER_KELAS_MANAGEMENT',
  source: 'Data dari Jadwal Kuliah (kelas kuliah) per tahun ajaran.',
  columns: [
    { key: 'semester', header: 'Semester' },
    { key: 'kodeProdi', header: 'Kode Prodi' },
    { key: 'kodeMk', header: 'Kode MK' },
    { key: 'namaMk', header: 'Nama MK' },
    { key: 'namaKelas', header: 'Nama Kelas' },
    { key: 'sks', header: 'SKS' },
    { key: 'bahasan', header: 'Bahasan' },
    { key: 'tanggalMulaiEfektif', header: 'Tanggal Mulai Efektif' },
    { key: 'tanggalAkhirEfektif', header: 'Tanggal Akhir Efektif' },
  ],
  async list({ search, offset, limit }) {
    const [jadwal, prodiMap] = await Promise.all([
      JadwalKuliah.findAll({ include: jadwalInclude, order: [['id', 'DESC']] }),
      loadKodeProdiByKodeMk(),
    ]);
    return paginateRows(
      jadwal.map((j) => ({
        id: j.id,
        semester: periodeFromTahunAjaran(j.tahunAjaran),
        kodeProdi: kodeProdiKelas(j.kelas, j.kodeMataKuliah, prodiMap),
        kodeMk: j.kodeMataKuliah,
        namaMk: j.namaMataKuliah,
        namaKelas: j.kelas,
        sks: j.sks ?? j.sksTeori + j.sksPraktik + j.sksLab,
        bahasan: '',
        tanggalMulaiEfektif: '',
        tanggalAkhirEfektif: '',
      })),
      { search, offset, limit }
    );
  },
};

const krs = {
  key: 'krs',
  title: 'KRS',
  group: GROUP,
  menuCode: 'SIM_FEEDER_KRS_MANAGEMENT',
  source: 'Data dari KRS mahasiswa yang sudah DISETUJUI.',
  columns: [
    { key: 'nim', header: 'NIM' },
    { key: 'nama', header: 'Nama' },
    { key: 'semester', header: 'Semester' },
    { key: 'kodeMk', header: 'Kode MK' },
    { key: 'namaMk', header: 'Nama MK' },
    { key: 'namaKelas', header: 'Nama Kelas' },
    { key: 'kodeProdi', header: 'Kode Prodi' },
  ],
  async list({ search, offset, limit }) {
    const [{ rows, count }, prodiMap] = await Promise.all([
      KrsDetail.findAndCountAll({
        include: [
          {
            model: Krs,
            as: 'krs',
            required: true,
            where: { status: 'DISETUJUI' },
            include: [
              { model: Mahasiswa, as: 'mahasiswa', required: true, where: mahasiswaSearch(search), attributes: ['nim', 'namaLengkap'] },
              { model: TahunAjaran, as: 'tahunAjaran' },
            ],
          },
          { model: JadwalKuliah, as: 'kelasKuliah', attributes: ['kodeMataKuliah', 'namaMataKuliah', 'kelas'] },
        ],
        order: [['id', 'DESC']],
        offset,
        limit,
        distinct: true,
      }),
      loadKodeProdiByKodeMk(),
    ]);
    return {
      count,
      rows: rows.map((d) => ({
        id: d.id,
        nim: d.krs.mahasiswa.nim,
        nama: d.krs.mahasiswa.namaLengkap,
        semester: periodeFromTahunAjaran(d.krs.tahunAjaran),
        kodeMk: d.kelasKuliah?.kodeMataKuliah ?? '',
        namaMk: d.kelasKuliah?.namaMataKuliah ?? '',
        namaKelas: d.kelasKuliah?.kelas ?? '',
        kodeProdi: kodeProdiKelas(d.kelasKuliah?.kelas, d.kelasKuliah?.kodeMataKuliah, prodiMap),
      })),
    };
  },
};

const RENCANA_TATAP_MUKA = 16;

const dosenAjar = {
  key: 'dosen-ajar',
  title: 'Dosen Ajar',
  group: GROUP,
  menuCode: 'SIM_FEEDER_DOSEN_AJAR_MANAGEMENT',
  source: 'Data dari Jadwal Kuliah (dosen koordinator & pengampu); realisasi dari Kehadiran Mengajar berstatus Hadir.',
  columns: [
    { key: 'nidn', header: 'NIDN' },
    { key: 'namaDosen', header: 'Nama Dosen' },
    { key: 'semester', header: 'Semester' },
    { key: 'kodeProdi', header: 'Kode Prodi' },
    { key: 'kodeMk', header: 'Kode MK' },
    { key: 'namaMk', header: 'Nama MK' },
    { key: 'namaKelas', header: 'Nama Kelas' },
    { key: 'sksSubstansi', header: 'SKS Substansi' },
    { key: 'rencanaTatapMuka', header: 'Rencana Tatap Muka' },
    { key: 'realisasiTatapMuka', header: 'Realisasi Tatap Muka' },
    { key: 'jenisEvaluasi', header: 'Jenis Evaluasi' },
  ],
  async list({ search, offset, limit }) {
    const [jadwal, prodiMap, realisasi] = await Promise.all([
      JadwalKuliah.findAll({
        include: [
          ...jadwalInclude,
          // unscoped + required:false: default scope Dosen membuat join wajib → jadwal tanpa pengampu hilang.
          { model: Dosen.unscoped(), as: 'dosenKordinator', attributes: ['id', 'nidn', 'namaLengkap'], required: false },
          { model: Dosen.unscoped(), as: 'dosenPengampu', attributes: ['id', 'nidn', 'namaLengkap'], through: { attributes: [] }, required: false },
        ],
        order: [['id', 'DESC']],
      }),
      loadKodeProdiByKodeMk(),
      KehadiranDosen.findAll({
        attributes: ['jadwalKuliahId', 'dosenId', [KehadiranDosen.sequelize.fn('COUNT', KehadiranDosen.sequelize.col('id')), 'jumlah']],
        where: { status: 'HADIR' },
        group: ['jadwalKuliahId', 'dosenId'],
        raw: true,
      }),
    ]);
    const realisasiMap = new Map(realisasi.map((r) => [`${r.jadwalKuliahId}-${r.dosenId}`, Number(r.jumlah)]));

    const rows = [];
    jadwal.forEach((j) => {
      const dosenList = new Map();
      if (j.dosenKordinator) dosenList.set(j.dosenKordinator.id, j.dosenKordinator);
      (j.dosenPengampu ?? []).forEach((d) => dosenList.set(d.id, d));
      const sks = j.sks ?? j.sksTeori + j.sksPraktik + j.sksLab;
      dosenList.forEach((d) => {
        rows.push({
          id: `${j.id}-${d.id}`,
          nidn: d.nidn,
          namaDosen: d.namaLengkap,
          semester: periodeFromTahunAjaran(j.tahunAjaran),
          kodeProdi: kodeProdiKelas(j.kelas, j.kodeMataKuliah, prodiMap),
          kodeMk: j.kodeMataKuliah,
          namaMk: j.namaMataKuliah,
          namaKelas: j.kelas,
          // SKS dibagi rata bila kelas diampu lebih dari satu dosen (team teaching).
          sksSubstansi: round2(sks / dosenList.size),
          rencanaTatapMuka: RENCANA_TATAP_MUKA,
          realisasiTatapMuka: realisasiMap.get(`${j.id}-${d.id}`) ?? 0,
          jenisEvaluasi: 'Evaluasi Akademik',
        });
      });
    });
    return paginateRows(rows, { search, offset, limit });
  },
};

const nilai = {
  key: 'nilai',
  title: 'Nilai',
  group: GROUP,
  menuCode: 'SIM_FEEDER_NILAI_MANAGEMENT',
  source: 'Data dari Nilai Mahasiswa. Periode diturunkan dari tahun masuk + semester.',
  columns: [
    { key: 'nim', header: 'NIM' },
    { key: 'nama', header: 'Nama' },
    { key: 'semester', header: 'Semester' },
    { key: 'kodeMk', header: 'Kode MK' },
    { key: 'namaMk', header: 'Nama MK' },
    { key: 'namaKelas', header: 'Nama Kelas' },
    { key: 'nilaiAngka', header: 'Nilai Angka' },
    { key: 'nilaiHuruf', header: 'Nilai Huruf' },
    { key: 'nilaiIndeks', header: 'Nilai Indeks' },
    { key: 'kodeProdi', header: 'Kode Prodi' },
  ],
  async list({ search, offset, limit }) {
    const { rows, count } = await NilaiMahasiswa.findAndCountAll({
      include: [
        {
          model: Mahasiswa,
          as: 'mahasiswa',
          required: true,
          where: mahasiswaSearch(search),
          attributes: ['nim', 'namaLengkap', 'tahunMasuk'],
          include: [
            { model: Jurusan, as: 'jurusan', attributes: ['kodeProdi'] },
            { model: GolonganKelas, as: 'golonganKelas', attributes: ['namaKelas'] },
          ],
        },
      ],
      order: [['id', 'DESC']],
      offset,
      limit,
    });
    return {
      count,
      rows: rows.map((n) => ({
        id: n.id,
        nim: n.mahasiswa.nim,
        nama: n.mahasiswa.namaLengkap,
        semester: periodeFromSemester(n.mahasiswa.tahunMasuk, n.semester),
        kodeMk: n.kodeMataKuliah,
        namaMk: n.namaMataKuliah,
        namaKelas: n.mahasiswa.golonganKelas?.namaKelas ?? '',
        nilaiAngka: n.nilai,
        nilaiHuruf: n.grade,
        nilaiIndeks: GRADE_BOBOT[n.grade] ?? 0,
        kodeProdi: n.mahasiswa.jurusan?.kodeProdi ?? '',
      })),
    };
  },
};

// ================= Tabel Feeder sendiri (CRUD) =================

const mahasiswaColumns = [
  { key: 'nim', header: 'NIM' },
  { key: 'nama', header: 'Nama' },
];
const mahasiswaCells = (record) => ({ nim: record.mahasiswa?.nim ?? '', nama: record.mahasiswa?.namaLengkap ?? '' });
const mahasiswaLabel = (record) => (record.mahasiswa ? `${record.mahasiswa.nim} - ${record.mahasiswa.namaLengkap}` : '');
const mahasiswaField = { key: 'mahasiswaId', label: 'Mahasiswa', type: 'lookup', lookup: 'mahasiswa', required: true };
const optionLabel = (options, value) => options.find((o) => o.value === value)?.label ?? value ?? '';

const akm = {
  key: 'akm',
  title: 'AKM (Aktivitas Kuliah Mahasiswa)',
  group: GROUP,
  menuCode: 'SIM_FEEDER_AKM_MANAGEMENT',
  source: 'Gunakan "Generate dari Nilai" untuk mengisi/menghitung ulang IPS, IPK & SKS dari Nilai Mahasiswa.',
  columns: [
    ...mahasiswaColumns,
    { key: 'periode', header: 'Semester' },
    { key: 'statusMahasiswa', header: 'Status Mahasiswa' },
    { key: 'ips', header: 'IPS' },
    { key: 'ipk', header: 'IPK' },
    { key: 'sksSemester', header: 'SKS Semester' },
    { key: 'sksTotal', header: 'SKS Total' },
    { key: 'biayaKuliah', header: 'Biaya Kuliah Smt' },
  ],
  crud: {
    model: FeederAkm,
    order: [['periode', 'DESC'], ['id', 'DESC']],
    fields: [
      mahasiswaField,
      { key: 'periode', label: 'Periode (mis. 20261)', type: 'text', required: true, pattern: '^\\d{4}[123]$' },
      { key: 'statusMahasiswa', label: 'Status Mahasiswa', type: 'select', options: STATUS_AKM_OPTIONS, required: true },
      { key: 'ips', label: 'IPS', type: 'number', min: 0, max: 4, step: 0.01, required: true },
      { key: 'ipk', label: 'IPK', type: 'number', min: 0, max: 4, step: 0.01, required: true },
      { key: 'sksSemester', label: 'SKS Semester', type: 'number', min: 0, required: true },
      { key: 'sksTotal', label: 'SKS Total', type: 'number', min: 0, required: true },
      { key: 'biayaKuliah', label: 'Biaya Kuliah Semester', type: 'number', min: 0 },
    ],
    toRow: (r) => ({
      ...mahasiswaCells(r),
      periode: r.periode,
      statusMahasiswa: r.statusMahasiswa,
      ips: r.ips,
      ipk: r.ipk,
      sksSemester: r.sksSemester,
      sksTotal: r.sksTotal,
      biayaKuliah: r.biayaKuliah ?? '',
    }),
    lookupLabels: (r) => ({ mahasiswaId: mahasiswaLabel(r) }),
    uniqueMessage: 'AKM mahasiswa ini pada periode tersebut sudah ada',
  },
  actions: [
    {
      key: 'generate',
      label: 'Generate dari Nilai',
      confirm: 'Hitung IPS, IPK & SKS semua mahasiswa dari Nilai Mahasiswa? Baris yang sudah ada diperbarui (status & biaya tidak diubah).',
      async run(actorId) {
        const nilaiRows = await NilaiMahasiswa.findAll({
          attributes: ['mahasiswaId', 'semester', 'sks', 'grade'],
          include: [{ model: Mahasiswa, as: 'mahasiswa', attributes: ['tahunMasuk'] }],
          order: [['mahasiswaId', 'ASC'], ['semester', 'ASC']],
        });
        // mahasiswaId -> semester -> { sks, mutu }
        const byMhs = new Map();
        nilaiRows.forEach((n) => {
          const perSmt = byMhs.get(n.mahasiswaId) ?? { tahunMasuk: n.mahasiswa?.tahunMasuk, smt: new Map() };
          const agg = perSmt.smt.get(n.semester) ?? { sks: 0, mutu: 0 };
          agg.sks += n.sks;
          agg.mutu += (GRADE_BOBOT[n.grade] ?? 0) * n.sks;
          perSmt.smt.set(n.semester, agg);
          byMhs.set(n.mahasiswaId, perSmt);
        });

        let created = 0;
        let updated = 0;
        for (const [mahasiswaId, { tahunMasuk, smt }] of byMhs) {
          let sksTotal = 0;
          let mutuTotal = 0;
          for (const semester of [...smt.keys()].sort((a, b) => a - b)) {
            const { sks, mutu } = smt.get(semester);
            sksTotal += sks;
            mutuTotal += mutu;
            const periode = periodeFromSemester(tahunMasuk, semester);
            const values = {
              ips: sks ? round2(mutu / sks) : 0,
              ipk: sksTotal ? round2(mutuTotal / sksTotal) : 0,
              sksSemester: sks,
              sksTotal,
              updatedBy: actorId,
            };
            const existing = await FeederAkm.findOne({ where: { mahasiswaId, periode } });
            if (existing) {
              await existing.update(values);
              updated += 1;
            } else {
              await FeederAkm.create({ mahasiswaId, periode, statusMahasiswa: 'A', ...values, createdBy: actorId });
              created += 1;
            }
          }
        }
        return { message: `AKM digenerate: ${created} baris baru, ${updated} baris diperbarui` };
      },
    },
  ],
};

const kelulusan = {
  key: 'kelulusan',
  title: 'Kelulusan / Drop Out',
  group: GROUP,
  menuCode: 'SIM_FEEDER_KELULUSAN_MANAGEMENT',
  source: 'Gunakan "Generate dari Yudisium" untuk mengisi mahasiswa yang sudah yudisium sebagai Lulus.',
  columns: [
    ...mahasiswaColumns,
    { key: 'jenisKeluar', header: 'Jenis Keluar' },
    { key: 'tanggalKeluar', header: 'Tanggal Keluar' },
    { key: 'periodeKeluar', header: 'Periode Keluar' },
    { key: 'noSkYudisium', header: 'No SK Yudisium' },
    { key: 'tanggalSkYudisium', header: 'Tanggal SK Yudisium' },
    { key: 'ipk', header: 'IPK' },
    { key: 'noIjazah', header: 'No Ijazah' },
    { key: 'judulSkripsi', header: 'Judul Skripsi' },
    { key: 'bulanAwalBimbingan', header: 'Bulan Awal Bimbingan' },
    { key: 'bulanAkhirBimbingan', header: 'Bulan Akhir Bimbingan' },
    { key: 'keterangan', header: 'Keterangan' },
  ],
  crud: {
    model: FeederKelulusan,
    order: [['tanggalKeluar', 'DESC'], ['id', 'DESC']],
    fields: [
      mahasiswaField,
      { key: 'jenisKeluar', label: 'Jenis Keluar', type: 'select', options: JENIS_KELUAR_OPTIONS, required: true },
      { key: 'tanggalKeluar', label: 'Tanggal Keluar', type: 'date', required: true },
      { key: 'periodeKeluar', label: 'Periode Keluar (mis. 20252)', type: 'text', pattern: '^\\d{4}[123]$' },
      { key: 'noSkYudisium', label: 'No SK Yudisium', type: 'text' },
      { key: 'tanggalSkYudisium', label: 'Tanggal SK Yudisium', type: 'date' },
      { key: 'ipk', label: 'IPK', type: 'number', min: 0, max: 4, step: 0.01 },
      { key: 'noIjazah', label: 'No Ijazah', type: 'text' },
      { key: 'judulSkripsi', label: 'Judul Skripsi/TA', type: 'textarea' },
      { key: 'bulanAwalBimbingan', label: 'Bulan Awal Bimbingan', type: 'date' },
      { key: 'bulanAkhirBimbingan', label: 'Bulan Akhir Bimbingan', type: 'date' },
      { key: 'keterangan', label: 'Keterangan', type: 'textarea' },
    ],
    toRow: (r) => ({
      ...mahasiswaCells(r),
      jenisKeluar: optionLabel(JENIS_KELUAR_OPTIONS, r.jenisKeluar),
      tanggalKeluar: r.tanggalKeluar ?? '',
      periodeKeluar: r.periodeKeluar ?? '',
      noSkYudisium: r.noSkYudisium ?? '',
      tanggalSkYudisium: r.tanggalSkYudisium ?? '',
      ipk: r.ipk ?? '',
      noIjazah: r.noIjazah ?? '',
      judulSkripsi: r.judulSkripsi ?? '',
      bulanAwalBimbingan: r.bulanAwalBimbingan ?? '',
      bulanAkhirBimbingan: r.bulanAkhirBimbingan ?? '',
      keterangan: r.keterangan ?? '',
    }),
    lookupLabels: (r) => ({ mahasiswaId: mahasiswaLabel(r) }),
    uniqueMessage: 'Data kelulusan mahasiswa ini sudah ada',
  },
  actions: [
    {
      key: 'generate',
      label: 'Generate dari Yudisium',
      confirm: 'Tambahkan semua mahasiswa yang sudah yudisium (belum ada di daftar) sebagai Lulus?',
      async run(actorId) {
        const [yudisiumList, existing] = await Promise.all([
          Yudisium.findAll({ include: [{ model: Mahasiswa, as: 'mahasiswa', attributes: ['id'] }] }),
          FeederKelulusan.findAll({ attributes: ['mahasiswaId'], raw: true }),
        ]);
        const sudahAda = new Set(existing.map((e) => e.mahasiswaId));
        const baru = yudisiumList.filter((y) => y.mahasiswa && !sudahAda.has(y.mahasiswaId));

        for (const y of baru) {
          const nilaiRows = await NilaiMahasiswa.findAll({ where: { mahasiswaId: y.mahasiswaId }, attributes: ['sks', 'grade'], raw: true });
          const sks = nilaiRows.reduce((s, n) => s + n.sks, 0);
          const mutu = nilaiRows.reduce((s, n) => s + (GRADE_BOBOT[n.grade] ?? 0) * n.sks, 0);
          const tanggal = y.tanggalYudisium ?? y.tanggalSk ?? null;
          await FeederKelulusan.create({
            mahasiswaId: y.mahasiswaId,
            jenisKeluar: '1',
            tanggalKeluar: tanggal,
            periodeKeluar: periodeFromDate(tanggal),
            noSkYudisium: y.noSk,
            tanggalSkYudisium: y.tanggalSk,
            ipk: sks ? round2(mutu / sks) : null,
            judulSkripsi: y.judul,
            createdBy: actorId,
            updatedBy: actorId,
          });
        }
        return { message: `${baru.length} mahasiswa yudisium ditambahkan sebagai Lulus` };
      },
    },
  ],
};

const nilaiTransfer = {
  key: 'nilai-transfer',
  title: 'Nilai Transfer',
  group: GROUP,
  menuCode: 'SIM_FEEDER_NILAI_TRANSFER_MANAGEMENT',
  source: 'Pengakuan mata kuliah dari perguruan tinggi / prodi asal untuk mahasiswa transfer.',
  columns: [
    ...mahasiswaColumns,
    { key: 'kodeMkAsal', header: 'Kode MK Asal' },
    { key: 'namaMkAsal', header: 'Nama MK Asal' },
    { key: 'sksAsal', header: 'SKS Asal' },
    { key: 'nilaiHurufAsal', header: 'Nilai Huruf Asal' },
    { key: 'kodeMkDiakui', header: 'Kode MK Diakui' },
    { key: 'namaMkDiakui', header: 'Nama MK Diakui' },
    { key: 'sksDiakui', header: 'SKS Diakui' },
    { key: 'nilaiHurufDiakui', header: 'Nilai Huruf Diakui' },
    { key: 'nilaiAngkaDiakui', header: 'Nilai Angka Diakui' },
  ],
  crud: {
    model: FeederNilaiTransfer,
    extraInclude: [{ model: MataKuliah.scope('withDeleted'), as: 'mataKuliah', attributes: MataKuliah.ATTRS_RINGKAS }],
    order: [['id', 'DESC']],
    fields: [
      mahasiswaField,
      { key: 'kodeMkAsal', label: 'Kode MK Asal', type: 'text', required: true },
      { key: 'namaMkAsal', label: 'Nama MK Asal', type: 'text', required: true },
      { key: 'sksAsal', label: 'SKS Asal', type: 'number', min: 0, required: true },
      { key: 'nilaiHurufAsal', label: 'Nilai Huruf Asal', type: 'text' },
      { key: 'mataKuliahId', label: 'Mata Kuliah Diakui', type: 'lookup', lookup: 'mataKuliah', required: true },
      { key: 'nilaiHurufDiakui', label: 'Nilai Huruf Diakui', type: 'select', options: NILAI_HURUF_OPTIONS, required: true },
    ],
    // Nilai angka (indeks) diakui selalu mengikuti huruf diakui supaya konsisten dengan skala nilai.
    beforeSave: (values) => ({ ...values, nilaiAngkaDiakui: GRADE_BOBOT[values.nilaiHurufDiakui] ?? 0 }),
    toRow: (r) => ({
      ...mahasiswaCells(r),
      kodeMkAsal: r.kodeMkAsal,
      namaMkAsal: r.namaMkAsal,
      sksAsal: r.sksAsal,
      nilaiHurufAsal: r.nilaiHurufAsal ?? '',
      kodeMkDiakui: r.mataKuliah?.kodeMk ?? '',
      namaMkDiakui: r.mataKuliah?.namaMk ?? '',
      sksDiakui: r.mataKuliah?.sks ?? '',
      nilaiHurufDiakui: r.nilaiHurufDiakui,
      nilaiAngkaDiakui: r.nilaiAngkaDiakui,
    }),
    lookupLabels: (r) => ({
      mahasiswaId: mahasiswaLabel(r),
      mataKuliahId: r.mataKuliah ? `${r.mataKuliah.kodeMk} - ${r.mataKuliah.namaMk}` : '',
    }),
  },
};

module.exports = [matakuliah, mahasiswa, kelas, krs, dosenAjar, nilai, akm, kelulusan, nilaiTransfer];
