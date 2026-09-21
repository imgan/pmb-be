const { Op } = require('sequelize');
const { Mahasiswa, MahasiswaBiodata, Peserta, GolonganKelas, Jurusan, TahunAjaran, sequelize } = require('../models');
const ApiError = require('../utils/ApiError');
const { getPagination, getPagingMeta } = require('../utils/pagination');
const { resolveOrder } = require('../utils/sorting');
const { buildWorkbook, parseWorkbookFromBase64, cellString } = require('../utils/excel');

/**
 * `required: false` di-set eksplisit pada tiap include — beberapa belongsTo sekaligus tanpa
 * itu terbukti bisa membuat Sequelize men-default salah satunya jadi INNER JOIN, sehingga baris
 * dengan FK nullable yang kosong (mis. tahunAjaranId belum diisi) hilang dari hasil query.
 */
const includeRelations = [
  { model: GolonganKelas, as: 'golonganKelas', required: false },
  { model: Jurusan, as: 'jurusan', required: false },
  { model: Peserta, as: 'peserta', attributes: ['id', 'namaLengkap', 'email'], required: false },
  { model: TahunAjaran, as: 'tahunAjaran', required: false },
];

const includeRelationsWithBiodata = [...includeRelations, { model: MahasiswaBiodata, as: 'biodata', required: false }];

const SORTABLE_COLUMNS = {
  nim: ['nim'],
  namaLengkap: ['namaLengkap'],
  email: ['email'],
  tahunMasuk: ['tahunMasuk'],
  isActive: ['isActive'],
  jurusan: [{ model: Jurusan, as: 'jurusan' }, 'namaJurusan'],
  golonganKelas: [{ model: GolonganKelas, as: 'golonganKelas' }, 'namaKelas'],
};

const listMahasiswa = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const where = {};
  if (query.search) {
    where[Op.or] = [
      { nim: { [Op.like]: `%${query.search}%` } },
      { namaLengkap: { [Op.like]: `%${query.search}%` } },
      { email: { [Op.like]: `%${query.search}%` } },
    ];
  }
  if (query.golonganKelasId) where.golonganKelasId = query.golonganKelasId;
  if (query.jurusanId) where.jurusanId = query.jurusanId;
  if (query.tahunMasuk) where.tahunMasuk = query.tahunMasuk;
  if (query.tahunAjaranId) where.tahunAjaranId = query.tahunAjaranId;
  if (query.isActive !== undefined) where.isActive = query.isActive === 'true' || query.isActive === true;
  if (query.statusKeluar) {
    const statuses = String(query.statusKeluar).split(',').filter(Boolean);
    where.statusKeluar = statuses.length > 1 ? { [Op.in]: statuses } : statuses[0];
  }

  // includeRelationsWithBiodata (bukan includeRelations) — daftar Mahasiswa dipakai juga oleh
  // halaman Biodata Mahasiswa (Prodi) & kolom biodata di tabel Mahasiswa (BAAK), jadi biodata
  // harus ikut ter-load dari sini, bukan cuma saat getMahasiswaById satu-satu.
  const { rows, count } = await Mahasiswa.findAndCountAll({
    where,
    include: includeRelationsWithBiodata,
    limit,
    offset,
    order: resolveOrder(query, SORTABLE_COLUMNS),
    subQuery: false,
    distinct: true,
  });

  return { data: rows, meta: getPagingMeta(count, page, limit) };
};

const getMahasiswaById = async (id) => {
  const mahasiswa = await Mahasiswa.findByPk(id, { include: includeRelationsWithBiodata });
  if (!mahasiswa) throw new ApiError(404, 'Mahasiswa not found');
  return mahasiswa;
};

const updateMahasiswa = async (id, payload, actorId) => {
  const mahasiswa = await Mahasiswa.findByPk(id);
  if (!mahasiswa) throw new ApiError(404, 'Mahasiswa not found');

  if (payload.nim) {
    const existing = await Mahasiswa.findOne({ where: { nim: payload.nim, id: { [Op.ne]: id } } });
    if (existing) throw new ApiError(409, 'NIM already registered');
  }

  await mahasiswa.update({ ...payload, updatedBy: actorId });
  return getMahasiswaById(id);
};

const deleteMahasiswa = async (id) => {
  const mahasiswa = await Mahasiswa.findByPk(id);
  if (!mahasiswa) throw new ApiError(404, 'Mahasiswa not found');
  await mahasiswa.destroy();
};

const getBiodata = async (mahasiswaId) => {
  const mahasiswa = await Mahasiswa.findByPk(mahasiswaId);
  if (!mahasiswa) throw new ApiError(404, 'Mahasiswa not found');
  return MahasiswaBiodata.findOne({ where: { mahasiswaId } });
};

const saveBiodata = async (mahasiswaId, payload, actorId) => {
  const mahasiswa = await Mahasiswa.findByPk(mahasiswaId);
  if (!mahasiswa) throw new ApiError(404, 'Mahasiswa not found');

  const biodata = await MahasiswaBiodata.findOne({ where: { mahasiswaId } });
  if (biodata) {
    await biodata.update(payload);
  } else {
    await MahasiswaBiodata.create({ ...payload, mahasiswaId });
  }
  await mahasiswa.update({ updatedBy: actorId });

  return MahasiswaBiodata.findOne({ where: { mahasiswaId } });
};

const eligiblePesertaWhere = (query) => {
  const where = { statusUjian: 'lulus', statusKelulusan: 'diterima', isActive: true };
  if (query.jurusanId) where.jurusanId = query.jurusanId;
  if (query.golonganKelasId) where.golonganKelasId = query.golonganKelasId;
  if (query.search) {
    where[Op.or] = [
      { namaLengkap: { [Op.like]: `%${query.search}%` } },
      { email: { [Op.like]: `%${query.search}%` } },
    ];
  }
  return where;
};

const getConvertedPesertaIds = async () => {
  const rows = await Mahasiswa.findAll({ attributes: ['pesertaId'], raw: true });
  return rows.map((r) => r.pesertaId);
};

const listEligiblePeserta = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const convertedIds = await getConvertedPesertaIds();

  const where = eligiblePesertaWhere(query);
  if (convertedIds.length) where.id = { [Op.notIn]: convertedIds };

  const { rows, count } = await Peserta.findAndCountAll({
    where,
    include: [
      { model: GolonganKelas, as: 'golonganKelas' },
      { model: Jurusan, as: 'jurusan' },
    ],
    limit,
    offset,
    order: [['id', 'ASC']],
  });

  return { data: rows, meta: getPagingMeta(count, page, limit) };
};

const getEligibleSummary = async () => {
  const convertedIds = await getConvertedPesertaIds();
  const where = eligiblePesertaWhere({});
  if (convertedIds.length) where.id = { [Op.notIn]: convertedIds };

  const summaryRows = await Peserta.findAll({
    where,
    include: [{ model: Jurusan, as: 'jurusan', attributes: ['id', 'namaJurusan'] }],
    attributes: ['jurusanId'],
    raw: true,
    nest: true,
  });

  const summaryMap = new Map();
  summaryRows.forEach((row) => {
    const key = row.jurusanId;
    if (!summaryMap.has(key)) {
      summaryMap.set(key, { jurusanId: key, namaJurusan: row.jurusan?.namaJurusan ?? '-', total: 0 });
    }
    summaryMap.get(key).total += 1;
  });

  return Array.from(summaryMap.values());
};

/**
 * Batch-converts peserta yang lulus ujian PMB menjadi mahasiswa dengan NIM digenerate
 * per jurusan (prefix input admin). Seluruh baris disusun di memori lalu ditulis dengan
 * satu kali Mahasiswa.bulkCreate (single batched INSERT), bukan create() per baris di dalam loop.
 */
const generateMahasiswaFromPeserta = async (payload, actorId) => {
  const { tahunAjaranId, jurusanPrefixes, pesertaIds } = payload;

  const tahunAjaran = await TahunAjaran.findByPk(tahunAjaranId);
  if (!tahunAjaran) throw new ApiError(404, 'Tahun ajaran not found');
  if (!tahunAjaran.isActive) throw new ApiError(400, 'Tahun ajaran ini sudah non-aktif, tidak bisa dipakai untuk generate mahasiswa baru');
  const tahunMasuk = tahunAjaran.tahunMulai;

  const convertedIds = await getConvertedPesertaIds();
  const where = eligiblePesertaWhere({});
  if (convertedIds.length) where.id = { [Op.notIn]: convertedIds };
  if (pesertaIds?.length) where.id = { ...(where.id || {}), [Op.in]: pesertaIds };

  const targetPeserta = await Peserta.findAll({
    where,
    include: [{ model: Jurusan, as: 'jurusan', attributes: ['id', 'namaJurusan'] }],
    order: [['id', 'ASC']],
  });

  if (!targetPeserta.length) {
    throw new ApiError(400, 'Tidak ada peserta lulus ujian yang siap dijadikan mahasiswa');
  }

  const distinctJurusan = new Map();
  targetPeserta.forEach((p) => distinctJurusan.set(p.jurusanId, p.jurusan?.namaJurusan ?? `#${p.jurusanId}`));

  const missingPrefix = [...distinctJurusan.entries()].filter(([jurusanId]) => !jurusanPrefixes[String(jurusanId)]);
  if (missingPrefix.length) {
    const names = missingPrefix.map(([, name]) => name).join(', ');
    throw new ApiError(400, `Prefix NIM belum diisi untuk jurusan: ${names}`);
  }

  const result = await sequelize.transaction(async (t) => {
    // Urutan NIM harus diturunkan dari NIM yang benar-benar sudah ada (kolom `nim`, yang punya
    // unique constraint), bukan dari kolom `urutan` per jurusan_id — supaya kalau dua jurusan
    // kebetulan dikasih prefix yang sama oleh admin, atau ada NIM lama dengan urutan yang tidak
    // sinkron, generator tetap mencari nilai terbesar yang match prefix+tahun lalu lanjut N+1,
    // bukan mengulang angka yang sudah dipakai.
    const distinctPrefixes = [...new Set([...distinctJurusan.keys()].map((jurusanId) => jurusanPrefixes[String(jurusanId)]))];

    const runningSeq = new Map();
    for (const prefix of distinctPrefixes) {
      const pattern = `${prefix}${tahunMasuk}`;
      const [rows] = await sequelize.query(
        'SELECT MAX(CAST(SUBSTRING(nim, :suffixStart) AS UNSIGNED)) AS maxSuffix FROM mahasiswa WHERE nim LIKE :pattern FOR UPDATE',
        {
          replacements: { suffixStart: pattern.length + 1, pattern: `${pattern}%` },
          transaction: t,
        }
      );
      runningSeq.set(prefix, Number(rows[0]?.maxSuffix) || 0);
    }

    const records = targetPeserta.map((peserta) => {
      const jurusanId = peserta.jurusanId;
      const prefix = jurusanPrefixes[String(jurusanId)];
      const nextUrutan = (runningSeq.get(prefix) || 0) + 1;
      runningSeq.set(prefix, nextUrutan);

      const nim = `${prefix}${tahunMasuk}${String(nextUrutan).padStart(4, '0')}`;

      return {
        nim,
        pesertaId: peserta.id,
        namaLengkap: peserta.namaLengkap,
        email: peserta.email,
        noTelepon: peserta.noTelepon,
        asalSekolah: peserta.asalSekolah,
        golonganKelasId: peserta.golonganKelasId,
        jurusanId,
        tahunMasuk,
        tahunAjaranId: tahunAjaran.id,
        urutan: nextUrutan,
        isActive: true,
        createdBy: actorId,
        updatedBy: actorId,
      };
    });

    const created = await Mahasiswa.bulkCreate(records, { transaction: t, validate: true });
    return created;
  });

  return { count: result.length, data: await Mahasiswa.findAll({ where: { id: result.map((r) => r.id) }, include: includeRelations, order: [['id', 'ASC']] }) };
};

/**
 * Kolom import/export biodata mahasiswa mengikuti format Dapodik/PDDikti (biodata lengkap +
 * data orang tua/wali) yang dipakai untuk migrasi data dari sistem lama. NIM adalah kunci
 * pencocokan; "Kode Prodi" HANYA informasi (diambil dari Jurusan.kodeProdi), tidak diproses
 * saat import — jurusan mahasiswa tetap dikelola lewat menu Mahasiswa/Generate Mahasiswa.
 */
const EXPORT_COLUMNS = [
  { header: 'NIM', key: 'nim' },
  { header: 'Nama', key: 'nama' },
  { header: 'Tempat Lahir', key: 'tempatLahir' },
  { header: 'Tanggal Lahir', key: 'tanggalLahir' },
  { header: 'Jenis Kelamin', key: 'jenisKelamin' },
  { header: 'NIK', key: 'nik' },
  { header: 'Agama', key: 'agama' },
  { header: 'NISN', key: 'nisn' },
  { header: 'Jalur Pendaftaran', key: 'jalurPendaftaran' },
  { header: 'NPWP', key: 'npwp' },
  { header: 'Kewarganegaraan', key: 'kewarganegaraan' },
  { header: 'Jenis Pendaftaran', key: 'jenisPendaftaran' },
  { header: 'Tgl Masuk Kuliah', key: 'tanggalMasukKuliah' },
  { header: 'Mulai Semester', key: 'mulaiSemester' },
  { header: 'Jalan', key: 'jalan' },
  { header: 'RT', key: 'rt' },
  { header: 'RW', key: 'rw' },
  { header: 'Nama Dusun', key: 'dusun' },
  { header: 'Kelurahan', key: 'kelurahan' },
  { header: 'Kecamatan', key: 'kecamatan' },
  { header: 'Kode Pos', key: 'kodePos' },
  { header: 'Jenis Tinggal', key: 'jenisTinggal' },
  { header: 'Alat Transportasi', key: 'alatTransportasi' },
  { header: 'Telp Rumah', key: 'teleponRumah' },
  { header: 'No HP', key: 'hp' },
  { header: 'Email', key: 'email' },
  { header: 'Terima KPS', key: 'terimaKps' },
  { header: 'No KPS', key: 'noKps' },
  { header: 'NIK Ayah', key: 'nikAyah' },
  { header: 'Nama Ayah', key: 'namaAyah' },
  { header: 'Tgl Lahir Ayah', key: 'tanggalLahirAyah' },
  { header: 'Pendidikan Ayah', key: 'pendidikanAyah' },
  { header: 'Pekerjaan Ayah', key: 'pekerjaanAyah' },
  { header: 'Penghasilan Ayah', key: 'penghasilanAyah' },
  { header: 'NIK Ibu', key: 'nikIbu' },
  { header: 'Nama Ibu', key: 'namaIbu' },
  { header: 'Tanggal Lahir Ibu', key: 'tanggalLahirIbu' },
  { header: 'Pendidikan Ibu', key: 'pendidikanIbu' },
  { header: 'Pekerjaan Ibu', key: 'pekerjaanIbu' },
  { header: 'Penghasilan Ibu', key: 'penghasilanIbu' },
  { header: 'Nama Wali', key: 'namaWali' },
  { header: 'Tanggal Lahir Wali', key: 'tanggalLahirWali' },
  { header: 'Pendidikan Wali', key: 'pendidikanWali' },
  { header: 'Pekerjaan Wali', key: 'pekerjaanWali' },
  { header: 'Penghasilan Wali', key: 'penghasilanWali' },
  { header: 'Kode Prodi', key: 'kodeProdi' },
  { header: 'Jenis Pembiayaan', key: 'jenisPembiayaan' },
  { header: 'Biaya Masuk', key: 'biayaMasuk' },
  { header: 'SKS Diakui', key: 'sksDiakui' },
  { header: 'Perguruan Tinggi Asal', key: 'perguruanTinggiAsal' },
  { header: 'Program Studi Asal', key: 'programStudiAsal' },
];

const exportMahasiswa = async () => {
  const rows = await Mahasiswa.findAll({ include: includeRelationsWithBiodata, order: [['nim', 'ASC']] });
  const data = rows.map((m) => {
    const b = m.biodata;
    return {
      nim: m.nim,
      nama: m.namaLengkap,
      tempatLahir: b?.tempatLahir ?? '',
      tanggalLahir: b?.tanggalLahir ?? '',
      jenisKelamin: b?.jenisKelamin ?? '',
      nik: b?.noKtp ?? '',
      agama: b?.agama ?? '',
      nisn: b?.nisn ?? '',
      jalurPendaftaran: b?.jalurPendaftaran ?? '',
      npwp: b?.npwp ?? '',
      kewarganegaraan: b?.kewarganegaraan ?? '',
      jenisPendaftaran: b?.jenisPendaftaran ?? '',
      tanggalMasukKuliah: b?.tanggalMasukKuliah ?? '',
      mulaiSemester: b?.mulaiSemester ?? '',
      jalan: b?.jalan ?? '',
      rt: b?.rt ?? '',
      rw: b?.rw ?? '',
      dusun: b?.dusun ?? '',
      kelurahan: b?.kelurahan ?? '',
      kecamatan: b?.kecamatan ?? '',
      kodePos: b?.kodePos ?? '',
      jenisTinggal: b?.jenisTinggal ?? '',
      alatTransportasi: b?.alatTransportasi ?? '',
      teleponRumah: b?.teleponRumah ?? '',
      hp: b?.hp ?? '',
      email: b?.email ?? m.email,
      terimaKps: b?.terimaKps ?? '',
      noKps: b?.noKps ?? '',
      nikAyah: b?.nikAyah ?? '',
      namaAyah: b?.namaAyah ?? '',
      tanggalLahirAyah: b?.tanggalLahirAyah ?? '',
      pendidikanAyah: b?.pendidikanAyah ?? '',
      pekerjaanAyah: b?.pekerjaanAyah ?? '',
      penghasilanAyah: b?.penghasilanAyah ?? '',
      nikIbu: b?.nikIbu ?? '',
      namaIbu: b?.namaIbu ?? '',
      tanggalLahirIbu: b?.tanggalLahirIbu ?? '',
      pendidikanIbu: b?.pendidikanIbu ?? '',
      pekerjaanIbu: b?.pekerjaanIbu ?? '',
      penghasilanIbu: b?.penghasilanIbu ?? '',
      namaWali: b?.namaWali ?? '',
      tanggalLahirWali: b?.tanggalLahirWali ?? '',
      pendidikanWali: b?.pendidikanWali ?? '',
      pekerjaanWali: b?.pekerjaanWali ?? '',
      penghasilanWali: b?.penghasilanWali ?? '',
      kodeProdi: m.jurusan?.kodeProdi ?? '',
      jenisPembiayaan: b?.jenisPembiayaan ?? '',
      biayaMasuk: b?.biayaMasuk ?? '',
      sksDiakui: b?.sksDiakui ?? '',
      perguruanTinggiAsal: b?.perguruanTinggiAsal ?? '',
      programStudiAsal: b?.programStudiAsal ?? '',
    };
  });
  return buildWorkbook('Mahasiswa', EXPORT_COLUMNS, data);
};

const exportMahasiswaTemplate = () => {
  const sample = {
    nim: 'TI20260001',
    nama: 'Contoh Nama Mahasiswa',
    tempatLahir: 'Jakarta',
    tanggalLahir: '2005-01-15',
    jenisKelamin: 'L',
    nik: '3171234567890001',
    agama: 'Islam',
    nisn: '0012345678',
    jalurPendaftaran: 'Reguler',
    npwp: '',
    kewarganegaraan: 'Indonesia',
    jenisPendaftaran: 'Mahasiswa Baru',
    tanggalMasukKuliah: '2026-09-01',
    mulaiSemester: '1',
    jalan: 'Jl. Contoh No. 1',
    rt: '001',
    rw: '002',
    dusun: '',
    kelurahan: 'Contoh Kelurahan',
    kecamatan: 'Contoh Kecamatan',
    kodePos: '12345',
    jenisTinggal: 'Orang Tua',
    alatTransportasi: 'Kendaraan Pribadi',
    teleponRumah: '021123456',
    hp: '081234567890',
    email: 'contoh@email.com',
    terimaKps: 'Tidak',
    noKps: '',
    nikAyah: '3171234567890002',
    namaAyah: 'Contoh Nama Ayah',
    tanggalLahirAyah: '1975-01-01',
    pendidikanAyah: 'SMA',
    pekerjaanAyah: 'Karyawan Swasta',
    penghasilanAyah: 'Rp 2.000.000 - Rp 4.999.999',
    nikIbu: '3171234567890003',
    namaIbu: 'Contoh Nama Ibu',
    tanggalLahirIbu: '1977-01-01',
    pendidikanIbu: 'SMA',
    pekerjaanIbu: 'Ibu Rumah Tangga',
    penghasilanIbu: 'Tidak Berpenghasilan',
    namaWali: '',
    tanggalLahirWali: '',
    pendidikanWali: '',
    pekerjaanWali: '',
    penghasilanWali: '',
    kodeProdi: '(informasi saja, tidak diproses saat import)',
    jenisPembiayaan: 'Mandiri',
    biayaMasuk: 1000000,
    sksDiakui: 0,
    perguruanTinggiAsal: '',
    programStudiAsal: '',
  };
  return buildWorkbook('Mahasiswa', EXPORT_COLUMNS, [sample]);
};

const cellNumber = (value) => {
  const cleaned = cellString(value).replace(/[^0-9-]/g, '');
  if (!cleaned) return null;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
};

const cellDate = (value) => {
  const str = cellString(value);
  return str || null;
};

/**
 * Import hanya MENGUBAH data mahasiswa yang sudah ada (dicocokkan lewat NIM) — tidak membuat
 * mahasiswa baru, karena pembuatan mahasiswa baru wajib melalui alur generate dari peserta
 * lulus (butuh pesertaId yang tidak bisa disediakan lewat file Excel). Nama mahasiswa (kolom
 * "Nama") ikut diperbarui di tabel mahasiswa; sisanya (kolom biodata Dapodik/PDDikti) disimpan
 * ke MahasiswaBiodata — dibuat otomatis kalau baris biodatanya belum ada. "Kode Prodi" sengaja
 * diabaikan (lihat catatan di atas EXPORT_COLUMNS).
 */
const importMahasiswa = async (fileBase64, actorId) => {
  const rows = await parseWorkbookFromBase64(fileBase64);
  const errors = [];
  let successCount = 0;

  const setIfPresent = (target, payload, header, key) => {
    if (payload[header] === undefined) return;
    target[key] = cellString(payload[header]) || null;
  };

  for (const { rowNumber, data } of rows) {
    const nim = cellString(data['NIM']);
    if (!nim) {
      errors.push({ row: rowNumber, message: 'NIM wajib diisi' });
      continue;
    }

    const mahasiswa = await Mahasiswa.findOne({ where: { nim } });
    if (!mahasiswa) {
      errors.push({ row: rowNumber, message: `Mahasiswa dengan NIM ${nim} tidak ditemukan` });
      continue;
    }

    const nama = cellString(data['Nama']);
    const jenisKelamin = cellString(data['Jenis Kelamin']).toUpperCase();
    if (jenisKelamin && !['L', 'P'].includes(jenisKelamin)) {
      errors.push({ row: rowNumber, message: 'Jenis Kelamin harus "L" atau "P"' });
      continue;
    }

    const biodataPayload = {};
    setIfPresent(biodataPayload, data, 'Tempat Lahir', 'tempatLahir');
    if (data['Tanggal Lahir'] !== undefined) biodataPayload.tanggalLahir = cellDate(data['Tanggal Lahir']);
    if (jenisKelamin) biodataPayload.jenisKelamin = jenisKelamin;
    setIfPresent(biodataPayload, data, 'NIK', 'noKtp');
    setIfPresent(biodataPayload, data, 'Agama', 'agama');
    setIfPresent(biodataPayload, data, 'NISN', 'nisn');
    setIfPresent(biodataPayload, data, 'Jalur Pendaftaran', 'jalurPendaftaran');
    setIfPresent(biodataPayload, data, 'NPWP', 'npwp');
    setIfPresent(biodataPayload, data, 'Kewarganegaraan', 'kewarganegaraan');
    setIfPresent(biodataPayload, data, 'Jenis Pendaftaran', 'jenisPendaftaran');
    if (data['Tgl Masuk Kuliah'] !== undefined) biodataPayload.tanggalMasukKuliah = cellDate(data['Tgl Masuk Kuliah']);
    setIfPresent(biodataPayload, data, 'Mulai Semester', 'mulaiSemester');
    setIfPresent(biodataPayload, data, 'Jalan', 'jalan');
    setIfPresent(biodataPayload, data, 'RT', 'rt');
    setIfPresent(biodataPayload, data, 'RW', 'rw');
    setIfPresent(biodataPayload, data, 'Nama Dusun', 'dusun');
    setIfPresent(biodataPayload, data, 'Kelurahan', 'kelurahan');
    setIfPresent(biodataPayload, data, 'Kecamatan', 'kecamatan');
    setIfPresent(biodataPayload, data, 'Kode Pos', 'kodePos');
    setIfPresent(biodataPayload, data, 'Jenis Tinggal', 'jenisTinggal');
    setIfPresent(biodataPayload, data, 'Alat Transportasi', 'alatTransportasi');
    setIfPresent(biodataPayload, data, 'Telp Rumah', 'teleponRumah');
    setIfPresent(biodataPayload, data, 'No HP', 'hp');
    setIfPresent(biodataPayload, data, 'Email', 'email');
    setIfPresent(biodataPayload, data, 'Terima KPS', 'terimaKps');
    setIfPresent(biodataPayload, data, 'No KPS', 'noKps');
    setIfPresent(biodataPayload, data, 'NIK Ayah', 'nikAyah');
    setIfPresent(biodataPayload, data, 'Nama Ayah', 'namaAyah');
    if (data['Tgl Lahir Ayah'] !== undefined) biodataPayload.tanggalLahirAyah = cellDate(data['Tgl Lahir Ayah']);
    setIfPresent(biodataPayload, data, 'Pendidikan Ayah', 'pendidikanAyah');
    setIfPresent(biodataPayload, data, 'Pekerjaan Ayah', 'pekerjaanAyah');
    setIfPresent(biodataPayload, data, 'Penghasilan Ayah', 'penghasilanAyah');
    setIfPresent(biodataPayload, data, 'NIK Ibu', 'nikIbu');
    setIfPresent(biodataPayload, data, 'Nama Ibu', 'namaIbu');
    if (data['Tanggal Lahir Ibu'] !== undefined) biodataPayload.tanggalLahirIbu = cellDate(data['Tanggal Lahir Ibu']);
    setIfPresent(biodataPayload, data, 'Pendidikan Ibu', 'pendidikanIbu');
    setIfPresent(biodataPayload, data, 'Pekerjaan Ibu', 'pekerjaanIbu');
    setIfPresent(biodataPayload, data, 'Penghasilan Ibu', 'penghasilanIbu');
    setIfPresent(biodataPayload, data, 'Nama Wali', 'namaWali');
    if (data['Tanggal Lahir Wali'] !== undefined) biodataPayload.tanggalLahirWali = cellDate(data['Tanggal Lahir Wali']);
    setIfPresent(biodataPayload, data, 'Pendidikan Wali', 'pendidikanWali');
    setIfPresent(biodataPayload, data, 'Pekerjaan Wali', 'pekerjaanWali');
    setIfPresent(biodataPayload, data, 'Penghasilan Wali', 'penghasilanWali');
    setIfPresent(biodataPayload, data, 'Jenis Pembiayaan', 'jenisPembiayaan');
    if (data['Biaya Masuk'] !== undefined) biodataPayload.biayaMasuk = cellNumber(data['Biaya Masuk']);
    if (data['SKS Diakui'] !== undefined) biodataPayload.sksDiakui = cellNumber(data['SKS Diakui']);
    setIfPresent(biodataPayload, data, 'Perguruan Tinggi Asal', 'perguruanTinggiAsal');
    setIfPresent(biodataPayload, data, 'Program Studi Asal', 'programStudiAsal');

    try {
      if (nama) await mahasiswa.update({ namaLengkap: nama, updatedBy: actorId });
      if (Object.keys(biodataPayload).length) {
        const biodata = await MahasiswaBiodata.findOne({ where: { mahasiswaId: mahasiswa.id } });
        if (biodata) {
          await biodata.update(biodataPayload);
        } else {
          await MahasiswaBiodata.create({ ...biodataPayload, mahasiswaId: mahasiswa.id });
        }
      }
      successCount += 1;
    } catch (err) {
      errors.push({ row: rowNumber, message: err.message });
    }
  }

  return { successCount, errorCount: errors.length, errors };
};

module.exports = {
  listMahasiswa,
  getMahasiswaById,
  updateMahasiswa,
  deleteMahasiswa,
  listEligiblePeserta,
  getEligibleSummary,
  generateMahasiswaFromPeserta,
  getBiodata,
  saveBiodata,
  exportMahasiswa,
  exportMahasiswaTemplate,
  importMahasiswa,
};
