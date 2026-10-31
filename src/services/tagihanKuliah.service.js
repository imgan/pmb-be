const { Op } = require('sequelize');
const {
  TagihanKuliah,
  PembayaranKuliah,
  Mahasiswa,
  Jurusan,
  GolonganKelas,
  TahunAjaran,
  TarifKuliah,
  DaftarPotongan,
  Krs,
  KrsDetail,
  JadwalKuliah,
  TagihanCicilan,
  sequelize,
} = require('../models');
const { hitungSaldoTagihan, urutanPeriode } = require('../utils/tagihanSaldo');
const { ringkasanCicilan } = require('../utils/tagihanCicilan');
const ApiError = require('../utils/ApiError');
const { buildWorkbook } = require('../utils/excel');
const { syncPotonganTagihan } = require('../utils/potonganTagihan');
const { getPagination, getPagingMeta } = require('../utils/pagination');
const { resolveSemesterMahasiswa } = require('../utils/hitungSemester');

const includeRelations = [
  { model: Mahasiswa, as: 'mahasiswa', include: [{ model: Jurusan, as: 'jurusan' }] },
  { model: TahunAjaran, as: 'tahunAjaran' },
];

const withSisa = (tagihan) => {
  const json = tagihan.toJSON ? tagihan.toJSON() : tagihan;
  const saldo = hitungSaldoTagihan(json);
  return {
    ...json,
    totalDibayar: saldo.totalDibayar,
    sisaTagihan: saldo.sisaSemester,
    tunggakan: saldo.tunggakan,
    totalKewajiban: saldo.totalKewajiban,
    statusTagihan: saldo.status,
  };
};

/**
 * Cari tarif kuliah yang berlaku untuk satu mahasiswa pada semester tertentu: Master Tarif Kuliah
 * berisi satu baris per prodi + angkatan (= Mahasiswa.tahunMasuk) + semester + status belajar
 * (semester 1 = BARU, selanjutnya LAMA; kelas karyawan memakai KARYAWAN / BARU KARYAWAN bila
 * tarifnya ada). Bila status yang diharapkan tidak ada, dipakai tarif semester itu yang tersedia.
 */
const findTarifKuliah = async (mahasiswa, semester) => {
  const tarifList = await TarifKuliah.findAll({
    where: { jurusanId: mahasiswa.jurusanId, tahunAngkatan: mahasiswa.tahunMasuk, semester, isActive: true },
    order: [['id', 'DESC']],
  });
  if (!tarifList.length) return null;
  const karyawan = /karyawan/i.test(mahasiswa.golonganKelas?.namaKelas ?? '');
  const reguler = semester === 1 ? 'BARU' : 'LAMA';
  const urutanStatus = karyawan ? [semester === 1 ? 'BARU KARYAWAN' : 'KARYAWAN', reguler] : [reguler];
  for (const status of urutanStatus) {
    const tarif = tarifList.find((t) => t.statusBelajar === status);
    if (tarif) return tarif;
  }
  return tarifList[0];
};

/**
 * KRS (FRS) mahasiswa yang sudah diajukan/disetujui untuk satu tahun ajaran — DRAFT tidak
 * dihitung (mahasiswa belum benar-benar mengunci mata kuliah yang diambil).
 */
const findKrsTerkunci = async (mahasiswaId, tahunAjaranId) =>
  Krs.findOne({
    where: { mahasiswaId, tahunAjaranId, status: { [Op.ne]: 'DRAFT' } },
    include: [
      {
        model: KrsDetail,
        as: 'detailList',
        include: [{ model: JadwalKuliah, as: 'kelasKuliah', attributes: ['id', 'sks'] }],
      },
    ],
    order: [['id', 'DESC']],
  });

/**
 * Generate tagihan kuliah untuk semua mahasiswa aktif pada satu tahun ajaran:
 * Biaya SKS + BPP + SPP (dari Master Tarif Kuliah sesuai semester mahasiswa) - potongan.
 *
 * "Biaya SKS" di Master Tarif sudah berupa TOTAL biaya SKS semester itu (bukan harga per SKS),
 * jadi tidak dikalikan SKS di KRS dan tetap ditagihkan meski mahasiswa belum mengisi KRS.
 * `sksDiambil` hanya dicatat sebagai informasi (dari KRS yang sudah diajukan/disetujui).
 * Semester diambil dari KRS, atau dihitung lewat resolveSemesterMahasiswa saat KRS belum ada.
 * Tunggakan semester sebelumnya tidak digabung: tiap semester punya tagihan & sisa sendiri.
 *
 * Mahasiswa yang SUDAH punya tagihan untuk tahun ajaran ini tetap DIHITUNG ULANG (bukan
 * dilewati) — supaya perubahan di KRS (tambah/kurang SKS), Master Tarif Kuliah, atau Daftar
 * Potongan setelah tagihan pertama dibuat ikut ter-update kalau admin menjalankan generate lagi.
 * Hanya baris yang nilainya benar-benar berubah yang ditulis ulang ke DB (dihitung di `updated`,
 * terpisah dari `generated` untuk baris yang baru dibuat). sisaTagihan otomatis ikut menyesuaikan
 * karena dihitung dari totalTagihan - totalDibayar setiap kali dibaca (lihat withSisa), jadi
 * pembayaran yang sudah tercatat tidak perlu diutak-atik. Mahasiswa yang tarif kuliahnya belum
 * terdaftar di Master Tarif Kuliah dilewati (dilaporkan lewat `skipped`).
 *
 * `mahasiswaIds` (opsional) membatasi generate ke mahasiswa tertentu saja — dipakai BAAK >
 * Generate NIM untuk generate tagihan semester 1 per kelas.
 */
const generateTagihan = async (tahunAjaranId, actorId, { mahasiswaIds } = {}) => {
  // Sistem tagihan berbasis import: nominal ditetapkan bagian keuangan lewat import Excel
  // (Keuangan > Tagihan Mahasiswa), bukan dihitung dari Master Tarif.
  if (!process.env.ENABLE_GENERATE_TAGIHAN) {
    throw new ApiError(410, 'Generate tagihan otomatis sudah tidak dipakai. Tagihan diisi lewat Import Tagihan (Excel) di menu Keuangan.');
  }
  const tahunAjaran = await TahunAjaran.findByPk(tahunAjaranId);
  if (!tahunAjaran) throw new ApiError(404, 'Tahun ajaran tidak ditemukan');

  const mahasiswaWhere = { isActive: true };
  if (mahasiswaIds) mahasiswaWhere.id = { [Op.in]: mahasiswaIds };
  const mahasiswaList = await Mahasiswa.findAll({
    where: mahasiswaWhere,
    include: [
      { model: TahunAjaran, as: 'tahunAjaran', required: false },
      { model: GolonganKelas, as: 'golonganKelas', attributes: ['namaKelas'], required: false },
    ],
  });

  const existingList = await TagihanKuliah.findAll({
    where: mahasiswaIds ? { tahunAjaranId, mahasiswaId: { [Op.in]: mahasiswaIds } } : { tahunAjaranId },
  });
  const existingByMahasiswaId = new Map(existingList.map((t) => [t.mahasiswaId, t]));

  let generated = 0;
  let updated = 0;
  const skipped = [];

  for (const mahasiswa of mahasiswaList) {
    const krs = await findKrsTerkunci(mahasiswa.id, tahunAjaranId);
    const sksDiambil = (krs?.detailList ?? []).reduce((sum, d) => sum + (d.kelasKuliah?.sks ?? 0), 0);
    const semester = krs ? krs.semester : resolveSemesterMahasiswa(mahasiswa, tahunAjaran);

    const tarif = await findTarifKuliah(mahasiswa, semester);
    if (!tarif) {
      skipped.push({
        mahasiswaId: mahasiswa.id,
        nim: mahasiswa.nim,
        alasan: `Tarif kuliah angkatan ${mahasiswa.tahunMasuk} semester ${semester} belum terdaftar`,
      });
      continue;
    }

    const potonganRows = await DaftarPotongan.findAll({
      where: { mahasiswaId: mahasiswa.id, [Op.or]: [{ semester }, { semester: null }] },
    });
    const potongan = potonganRows.reduce((sum, p) => sum + p.biaya, 0);

    const totalTagihan = Math.max(tarif.biayaSks + tarif.biayaBpp + tarif.biayaSpp - potongan, 0);

    const payload = {
      semester,
      sksDiambil,
      hargaPerSks: 0,
      biayaSks: tarif.biayaSks,
      biayaBpp: tarif.biayaBpp,
      biayaSpp: tarif.biayaSpp,
      potongan,
      totalTagihan,
    };

    const existing = existingByMahasiswaId.get(mahasiswa.id);
    if (existing) {
      const isChanged = Object.entries(payload).some(([key, value]) => existing[key] !== value);
      if (isChanged) {
        await existing.update({ ...payload, updatedBy: actorId });
        updated += 1;
      }
      continue;
    }

    await TagihanKuliah.create({
      mahasiswaId: mahasiswa.id,
      tahunAjaranId,
      ...payload,
      createdBy: actorId,
      updatedBy: actorId,
    });
    generated += 1;
  }

  return { generated, updated, skippedCount: skipped.length, skipped };
};

/**
 * Filter status tagihan: LUNAS / SEBAGIAN / BELUM_BAYAR (status sisa semester ini) dan ADA_TUNGGAKAN
 * (masih punya tunggakan semester sebelumnya). Status dihitung dari saldo (bayar import + transaksi
 * kasir setelah import), jadi difilter setelah saldo dihitung.
 */
const STATUS_FILTER = {
  LUNAS: (t) => t.statusTagihan === 'LUNAS',
  SEBAGIAN: (t) => t.statusTagihan === 'SEBAGIAN',
  BELUM_BAYAR: (t) => t.statusTagihan === 'BELUM_BAYAR',
  ADA_TUNGGAKAN: (t) => t.tunggakanSemesterLalu > 0,
};

/**
 * Tunggakan semester lalu per tagihan: kolom Tunggakan dari file import bila diisi; bila kosong,
 * jumlah sisa tagihan semester-semester SEBELUMNYA milik mahasiswa yang sama (file per semester
 * tidak selalu menyertakan kolom Tunggakan).
 */
const attachTunggakanSemesterLalu = async (rows) => {
  const mahasiswaIds = [...new Set(rows.map((t) => t.mahasiswaId))];
  if (!mahasiswaIds.length) return rows;
  const semua = (
    await TagihanKuliah.findAll({
      where: { mahasiswaId: { [Op.in]: mahasiswaIds } },
      include: [
        { model: TahunAjaran, as: 'tahunAjaran' },
        { model: PembayaranKuliah, as: 'pembayaranList' },
      ],
    })
  ).map((t) => ({ mahasiswaId: t.mahasiswaId, urutan: urutanPeriode(t), sisa: hitungSaldoTagihan(t.toJSON()).sisaSemester }));
  return rows.map((t) => {
    const urutan = urutanPeriode(t);
    const sisaLalu = semua.filter((x) => x.mahasiswaId === t.mahasiswaId && x.urutan < urutan).reduce((sum, x) => sum + x.sisa, 0);
    return { ...t, tunggakanSemesterLalu: t.tunggakan > 0 ? t.tunggakan : sisaLalu };
  });
};

/**
 * Total SKS yang diambil mahasiswa pada tahun akademik tagihan = jumlah SKS jadwal di KRS-nya
 * (KRS yang ditolak tidak dihitung). Semester lama yang tidak punya KRS (nilai diimpor dari SIAKAD
 * lama) memakai jumlah SKS nilai semester tsb. null = belum ada KRS maupun nilai.
 */
const attachTotalSks = async (rows) => {
  const mahasiswaIds = [...new Set(rows.map((t) => t.mahasiswaId))];
  if (!mahasiswaIds.length) return rows;
  const sks = await sequelize.query(
    `SELECT k.mahasiswa_id AS mahasiswaId, k.tahun_ajaran_id AS tahunAjaranId, SUM(COALESCE(j.sks, 0)) AS totalSks
     FROM krs k
     JOIN krs_detail d ON d.krs_id = k.id
     JOIN jadwal_kuliah j ON j.id = d.jadwal_kuliah_id
     WHERE k.mahasiswa_id IN (:mahasiswaIds) AND k.status <> 'DITOLAK'
     GROUP BY k.mahasiswa_id, k.tahun_ajaran_id`,
    { replacements: { mahasiswaIds }, type: sequelize.QueryTypes.SELECT }
  );
  const sksNilai = await sequelize.query(
    `SELECT mahasiswa_id AS mahasiswaId, semester, SUM(sks) AS totalSks
     FROM nilai_mahasiswa WHERE mahasiswa_id IN (:mahasiswaIds) GROUP BY mahasiswa_id, semester`,
    { replacements: { mahasiswaIds }, type: sequelize.QueryTypes.SELECT }
  );
  const byKrs = new Map(sks.map((r) => [`${r.mahasiswaId}-${r.tahunAjaranId}`, Number(r.totalSks)]));
  const byNilai = new Map(sksNilai.map((r) => [`${r.mahasiswaId}-${r.semester}`, Number(r.totalSks)]));
  return rows.map((t) => ({
    ...t,
    totalSks: byKrs.get(`${t.mahasiswaId}-${t.tahunAjaranId}`) ?? byNilai.get(`${t.mahasiswaId}-${t.semester}`) ?? null,
  }));
};

/** Ringkasan cicilan bulanan (jumlah, lunas, cicilan berikutnya) per tagihan; null = tanpa cicilan. */
const attachCicilan = async (rows) => {
  const ids = rows.map((t) => t.id);
  if (!ids.length) return rows;
  const cicilan = await TagihanCicilan.findAll({ where: { tagihanKuliahId: { [Op.in]: ids } }, raw: true });
  return rows.map((t) => ({
    ...t,
    cicilan: ringkasanCicilan(cicilan.filter((c) => c.tagihanKuliahId === t.id), t.totalDibayar),
  }));
};

const listQueryOptions = (query) => {
  const where = {};
  // tahunAjaranId boleh satu id, array, atau '1,2,3' (export beberapa tahun akademik sekaligus).
  const taIds = [].concat(query.tahunAjaranId ?? []).flatMap((v) => String(v).split(',')).map(Number).filter(Boolean);
  if (taIds.length) where.tahunAjaranId = { [Op.in]: taIds };
  const mahasiswaWhere = {};
  if (query.search) {
    mahasiswaWhere[Op.or] = [
      { nim: { [Op.like]: `%${query.search}%` } },
      { namaLengkap: { [Op.like]: `%${query.search}%` } },
    ];
  }
  return {
    where,
    include: [
      {
        model: Mahasiswa,
        as: 'mahasiswa',
        required: true,
        where: Reflect.ownKeys(mahasiswaWhere).length ? mahasiswaWhere : undefined,
        include: [{ model: Jurusan, as: 'jurusan' }, { model: GolonganKelas, as: 'golonganKelas' }],
      },
      { model: TahunAjaran, as: 'tahunAjaran' },
      { model: PembayaranKuliah, as: 'pembayaranList' },
    ],
    order: [['id', 'DESC']],
    subQuery: false,
    distinct: true,
  };
};

/** Semua tagihan sesuai filter (tanpa paginasi) — dipakai filter status & export. */
const findTagihanFiltered = async (query) => {
  const rows = await attachCicilan(await attachTotalSks(await attachTunggakanSemesterLalu((await TagihanKuliah.findAll(listQueryOptions(query))).map(withSisa))));
  const cocok = STATUS_FILTER[query.status];
  return cocok ? rows.filter(cocok) : rows;
};

const listTagihan = async (query) => {
  const { page, limit, offset } = getPagination(query);
  if (STATUS_FILTER[query.status]) {
    const rows = await findTagihanFiltered(query);
    return { data: rows.slice(offset, offset + limit), meta: getPagingMeta(rows.length, page, limit) };
  }
  const { rows, count } = await TagihanKuliah.findAndCountAll({ ...listQueryOptions(query), limit, offset });
  return { data: await attachCicilan(await attachTotalSks(await attachTunggakanSemesterLalu(rows.map(withSisa)))), meta: getPagingMeta(count, page, limit) };
};

const STATUS_TAGIHAN_LABEL = { LUNAS: 'Lunas', SEBAGIAN: 'Sebagian', BELUM_BAYAR: 'Belum Bayar' };
const EXPORT_COLUMNS = [
  { header: 'NIM', key: 'nim', width: 16 },
  { header: 'Nama', key: 'nama', width: 30 },
  { header: 'Prodi', key: 'prodi', width: 30 },
  { header: 'Kelas', key: 'kelas', width: 12 },
  { header: 'Angkatan', key: 'angkatan', width: 10 },
  { header: 'Tahun Akademik', key: 'tahunAkademik', width: 16 },
  { header: 'Semester', key: 'semester', width: 10 },
  { header: 'Total SKS', key: 'totalSks', width: 10 },
  { header: 'Tagihan Awal', key: 'tagihanAwal', width: 16 },
  { header: 'Potongan', key: 'potongan', width: 14 },
  { header: 'Total Tagihan', key: 'totalTagihan', width: 16 },
  { header: 'Dibayar', key: 'dibayar', width: 16 },
  { header: 'Sisa Semester', key: 'sisaSemester', width: 16 },
  { header: 'Tunggakan Semester Lalu', key: 'tunggakanSemesterLalu', width: 18 },
  { header: 'Total Kewajiban', key: 'totalKewajiban', width: 16 },
  { header: 'Jatuh Tempo', key: 'jatuhTempo', width: 14 },
  { header: 'No Virtual Account', key: 'noVirtualAccount', width: 22 },
  { header: 'Status', key: 'status', width: 14 },
  { header: 'Keterangan', key: 'keterangan', width: 30 },
];

/** Export Excel daftar tagihan dengan filter yang sama seperti tampilan (tahun akademik, cari, status). */
const exportTagihan = async (query) => {
  const rows = await findTagihanFiltered(query);
  const data = rows
    .sort((a, b) => String(a.mahasiswa?.nim).localeCompare(String(b.mahasiswa?.nim)))
    .map((t) => ({
      nim: t.mahasiswa?.nim ?? '',
      nama: t.mahasiswa?.namaLengkap ?? '',
      prodi: t.mahasiswa?.jurusan?.namaJurusan ?? '',
      kelas: t.mahasiswa?.golonganKelas?.namaKelas ?? '',
      angkatan: t.mahasiswa?.tahunMasuk ?? '',
      tahunAkademik: t.tahunAjaran ? `${t.tahunAjaran.nama} ${t.tahunAjaran.jenisSemester}` : '',
      semester: t.semester,
      totalSks: t.totalSks ?? '',
      tagihanAwal: Number(t.tagihanAwal ?? t.totalTagihan),
      potongan: Number(t.potongan ?? 0),
      totalTagihan: Number(t.totalTagihan),
      dibayar: t.totalDibayar,
      sisaSemester: t.sisaTagihan,
      tunggakanSemesterLalu: t.tunggakanSemesterLalu,
      totalKewajiban: t.sisaTagihan + t.tunggakanSemesterLalu,
      jatuhTempo: t.tanggalJatuhTempo ?? '',
      noVirtualAccount: t.noVirtualAccount ?? '',
      status: STATUS_TAGIHAN_LABEL[t.statusTagihan] ?? t.statusTagihan,
      keterangan: t.keterangan ?? '',
    }));
  const workbook = buildWorkbook('Tagihan', EXPORT_COLUMNS, data);
  const sheet = workbook.getWorksheet('Tagihan');
  ['tagihanAwal', 'potongan', 'totalTagihan', 'dibayar', 'sisaSemester', 'tunggakanSemesterLalu', 'totalKewajiban'].forEach((key) => {
    sheet.getColumn(key).numFmt = '#,##0';
  });
  return workbook;
};

/**
 * Riwayat pembayaran satu mahasiswa (semua semester): per tagihan — tagihan awal, potongan, total,
 * dibayar menurut file import, transaksi kasir, sisa & status — beserta daftar transaksi kasir.
 * Transaksi kasir sebelum importedAt sudah termasuk di "dibayar (import)" sehingga ditandai
 * tidak dihitung lagi (lihat utils/tagihanSaldo.js).
 */
const getRiwayatPembayaranMahasiswa = async (mahasiswaId) => {
  const mahasiswa = await Mahasiswa.findByPk(mahasiswaId, {
    attributes: ['id', 'nim', 'namaLengkap', 'tahunMasuk'],
    include: [
      { model: Jurusan, as: 'jurusan', attributes: ['namaJurusan'], required: false },
      { model: GolonganKelas, as: 'golonganKelas', attributes: ['namaKelas'], required: false },
    ],
  });
  if (!mahasiswa) throw new ApiError(404, 'Mahasiswa tidak ditemukan');
  const tagihanList = await TagihanKuliah.findAll({
    where: { mahasiswaId },
    include: [
      { model: TahunAjaran, as: 'tahunAjaran' },
      { model: PembayaranKuliah, as: 'pembayaranList' },
    ],
  });
  const semester = tagihanList
    .sort((a, b) => urutanPeriode(a) - urutanPeriode(b))
    .map((t) => {
      const json = t.toJSON();
      const saldo = hitungSaldoTagihan(json);
      const batas = json.importedAt ? new Date(json.importedAt).getTime() : null;
      return {
        id: json.id,
        periode: json.tahunAjaran ? `${json.tahunAjaran.nama} ${json.tahunAjaran.jenisSemester}` : '-',
        semester: json.semester,
        tagihanAwal: Number(json.tagihanAwal ?? json.totalTagihan),
        potongan: Number(json.potongan ?? 0),
        totalTagihan: saldo.totalTagihan,
        dibayarImport: saldo.dibayarImport,
        dibayarTransaksi: saldo.dibayarTransaksi,
        totalDibayar: saldo.totalDibayar,
        sisa: saldo.sisaSemester,
        status: saldo.status,
        importedAt: json.importedAt,
        tanggalJatuhTempo: json.tanggalJatuhTempo,
        noVirtualAccount: json.noVirtualAccount,
        keterangan: json.keterangan,
        transaksi: (json.pembayaranList ?? [])
          .sort((a, b) => String(b.tanggalBayar).localeCompare(String(a.tanggalBayar)))
          .map((p) => ({
            id: p.id,
            tanggalBayar: p.tanggalBayar,
            noBukti: p.noBukti,
            nominal: Number(p.nominal),
            kodeBank: p.kodeBank,
            keterangan: p.keterangan,
            terhitung: batas === null || new Date(p.createdAt).getTime() > batas,
          })),
      };
    });
  const total = (key) => semester.reduce((sum, s) => sum + s[key], 0);
  return {
    mahasiswa,
    ringkasan: {
      totalTagihan: total('totalTagihan'),
      totalPotongan: total('potongan'),
      totalDibayar: total('totalDibayar'),
      totalSisa: total('sisa'),
    },
    semester,
  };
};

/**
 * Edit manual satu tagihan. "Tagihan" yang diedit = tagihanAwal (sebelum potongan); totalTagihan
 * dihitung ulang dari Daftar Potongan. Total bayar = posisi bayar menurut keuangan (transaksi kasir
 * setelah import tetap ditambahkan di atasnya).
 */
const updateTagihan = async (id, payload, actorId) => {
  const tagihan = await TagihanKuliah.findByPk(id);
  if (!tagihan) throw new ApiError(404, 'Tagihan kuliah tidak ditemukan');
  const updates = { updatedBy: actorId };
  if (payload.tagihanAwal !== undefined) {
    updates.tagihanAwal = payload.tagihanAwal;
    updates.totalTagihan = Math.max(payload.tagihanAwal - (tagihan.potongan ?? 0), 0);
  }
  if (payload.totalBayarImport !== undefined) updates.totalBayarImport = payload.totalBayarImport;
  if (payload.tanggalJatuhTempo !== undefined) updates.tanggalJatuhTempo = payload.tanggalJatuhTempo || null;
  if (payload.noVirtualAccount !== undefined) updates.noVirtualAccount = payload.noVirtualAccount || null;
  if (payload.keterangan !== undefined) updates.keterangan = payload.keterangan || null;
  // Tagihan hasil generate lama belum punya tagihanAwal: jadikan tagihan import agar potongan tersinkron.
  if (tagihan.sumber !== 'IMPORT' && updates.tagihanAwal !== undefined) updates.sumber = 'IMPORT';
  await tagihan.update(updates);
  await syncPotonganTagihan([tagihan.mahasiswaId]);
  return getTagihanById(id);
};

/** Hapus tagihan — ditolak bila sudah ada transaksi kasir (hapus transaksinya dulu di Pembayaran Kuliah). */
const deleteTagihan = async (id) => {
  const tagihan = await TagihanKuliah.findByPk(id, { include: [{ model: PembayaranKuliah, as: 'pembayaranList' }] });
  if (!tagihan) throw new ApiError(404, 'Tagihan kuliah tidak ditemukan');
  if (tagihan.pembayaranList?.length) {
    throw new ApiError(
      400,
      `Tagihan ini sudah memiliki ${tagihan.pembayaranList.length} transaksi pembayaran kasir. Hapus transaksinya terlebih dahulu di menu Pembayaran Kuliah.`
    );
  }
  await tagihan.destroy();
};

const getTagihanById = async (id) => {
  const tagihan = await TagihanKuliah.findByPk(id, {
    include: [...includeRelations, { model: PembayaranKuliah, as: 'pembayaranList' }],
  });
  if (!tagihan) throw new ApiError(404, 'Tagihan kuliah tidak ditemukan');
  return withSisa(tagihan);
};

/** Dipakai halaman Pembayaran Kuliah: cari tagihan aktif mahasiswa berdasarkan NIM atau nama (partial match). */
const findTagihanAktifByNim = async (search, tahunAjaranId) => {
  const mahasiswaList = await Mahasiswa.findAll({
    where: {
      [Op.or]: [{ nim: { [Op.like]: `%${search}%` } }, { namaLengkap: { [Op.like]: `%${search}%` } }],
    },
    limit: 20,
  });
  if (!mahasiswaList.length) throw new ApiError(404, `Mahasiswa dengan NIM/Nama "${search}" tidak ditemukan`);

  const where = { mahasiswaId: { [Op.in]: mahasiswaList.map((m) => m.id) } };
  if (tahunAjaranId) where.tahunAjaranId = tahunAjaranId;

  const tagihanList = await TagihanKuliah.findAll({
    where,
    include: [...includeRelations, { model: PembayaranKuliah, as: 'pembayaranList' }],
    order: [['id', 'DESC']],
  });
  return tagihanList.map(withSisa);
};

module.exports = { generateTagihan, listTagihan, getTagihanById, findTagihanAktifByNim, findTarifKuliah, exportTagihan, getRiwayatPembayaranMahasiswa, updateTagihan, deleteTagihan };
