const { Op } = require('sequelize');
const { sequelize, PembayaranWisuda, Mahasiswa, TagihanWisuda, TagihanWisudaCicilan, TarifLain, TahunAjaran, Jurusan, User } = require('../models');
const ApiError = require('../utils/ApiError');
const { getPagination, getPagingMeta } = require('../utils/pagination');
const { resolveOrder } = require('../utils/sorting');
const { postJurnal, getAkunByKode, hapusJurnalReferensi } = require('./jurnal.service');
const { alokasiCicilan, ringkasanCicilan, bagiRata, tambahBulan, jatuhTempoBulan } = require('../utils/tagihanCicilan');
const { resolveSemesterMahasiswa } = require('../utils/hitungSemester');

const SORTABLE_COLUMNS = {
  tanggalBayar: ['tanggalBayar'],
  noBukti: ['noBukti'],
  bayar: ['bayar'],
};

const listPembayaranWisuda = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const where = {};
  if (query.mahasiswaId) where.mahasiswaId = query.mahasiswaId;

  const { rows, count } = await PembayaranWisuda.findAndCountAll({
    where,
    limit,
    offset,
    order: resolveOrder(query, SORTABLE_COLUMNS, [['id', 'DESC']]),
  });
  return { data: rows, meta: getPagingMeta(count, page, limit) };
};

// Tahun lulus = tahun tanggal yudisium (cadangan: tanggal SK yudisium).
const TAHUN_LULUS = 'YEAR(COALESCE(y.tanggal_yudisium, y.tanggal_sk))';

const SISA = 'COALESCE(t.tagihan, 0) - COALESCE(b.total, 0)';
const SYARAT_STATUS = {
  LUNAS: `COALESCE(t.tagihan, 0) > 0 AND ${SISA} <= 0`,
  SEBAGIAN: `${SISA} > 0 AND COALESCE(b.total, 0) > 0`,
  BELUM: `${SISA} > 0 AND COALESCE(b.total, 0) = 0`,
  BELUM_DITAGIH: 'COALESCE(t.tagihan, 0) = 0',
  // Tab Tunggakan: masih ada sisa tagihan.
  TUNGGAKAN: `${SISA} > 0`,
};
const statusBaris = (tagihan, total) => (tagihan <= 0 ? 'BELUM_DITAGIH' : total >= tagihan ? 'LUNAS' : total > 0 ? 'SEBAGIAN' : 'BELUM');

/**
 * Daftar mahasiswa untuk menu Pembayaran Wisuda + tagihan, dibayar, sisa & tahun lulus.
 * Filter: search (NIM / nama), statusBayar (lihat SYARAT_STATUS), tahunLulus (tahun | BELUM = belum yudisium).
 */
const listMahasiswaWisuda = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const syarat = [];
  const replacements = { limit, offset };
  const kata = String(query.search ?? '').trim();
  if (kata) {
    syarat.push('(m.nim LIKE :kata OR m.nama_lengkap LIKE :kata)');
    replacements.kata = `%${kata}%`;
  }
  if (SYARAT_STATUS[query.statusBayar]) syarat.push(SYARAT_STATUS[query.statusBayar]);
  if (query.tahunLulus === 'BELUM') syarat.push(`${TAHUN_LULUS} IS NULL`);
  else if (Number(query.tahunLulus)) {
    syarat.push(`${TAHUN_LULUS} = :tahunLulus`);
    replacements.tahunLulus = Number(query.tahunLulus);
  }
  const dari = `FROM mahasiswa m
    LEFT JOIN jurusan j ON j.id = m.jurusan_id
    LEFT JOIN yudisium y ON y.mahasiswa_id = m.id
    LEFT JOIN (SELECT mahasiswa_id, SUM(total_tagihan) AS tagihan, GROUP_CONCAT(DISTINCT COALESCE(keterangan, tahun) ORDER BY tahun SEPARATOR ', ') AS periode FROM tagihan_wisuda GROUP BY mahasiswa_id) t ON t.mahasiswa_id = m.id
    LEFT JOIN (SELECT mahasiswa_id, SUM(bayar) AS total FROM pembayaran_wisuda GROUP BY mahasiswa_id) b ON b.mahasiswa_id = m.id
    ${syarat.length ? `WHERE ${syarat.join(' AND ')}` : ''}`;
  const pilih = { replacements, type: sequelize.QueryTypes.SELECT };
  const urut = query.statusBayar === 'TUNGGAKAN' ? `${SISA} DESC, m.id DESC` : 'm.id DESC';
  const [rows, [ringkas], tahun] = await Promise.all([
    sequelize.query(
      `SELECT m.id, m.nim, m.nama_lengkap AS namaLengkap, m.tahun_masuk AS tahunMasuk, j.nama_jurusan AS namaJurusan, ${TAHUN_LULUS} AS tahunLulus,
              t.periode, COALESCE(t.tagihan, 0) AS tagihan, COALESCE(b.total, 0) AS dibayar
       ${dari} ORDER BY ${urut} LIMIT :limit OFFSET :offset`,
      pilih
    ),
    sequelize.query(`SELECT COUNT(*) AS total, COALESCE(SUM(GREATEST(${SISA}, 0)), 0) AS totalSisa ${dari}`, pilih),
    sequelize.query(`SELECT DISTINCT ${TAHUN_LULUS} AS tahun FROM yudisium y WHERE ${TAHUN_LULUS} IS NOT NULL ORDER BY tahun DESC`, { type: sequelize.QueryTypes.SELECT }),
  ]);
  return {
    data: rows.map((r) => {
      const tagihan = Number(r.tagihan);
      const dibayar = Number(r.dibayar);
      return {
        id: r.id,
        nim: r.nim,
        namaLengkap: r.namaLengkap,
        tahunMasuk: r.tahunMasuk,
        jurusan: r.namaJurusan ? { namaJurusan: r.namaJurusan } : null,
        tahunLulus: r.tahunLulus === null ? null : Number(r.tahunLulus),
        periode: r.periode ?? null,
        tagihan,
        dibayar,
        sisa: Math.max(tagihan - dibayar, 0),
        status: statusBaris(tagihan, dibayar),
      };
    }),
    meta: { ...getPagingMeta(Number(ringkas.total), page, limit), totalSisa: Number(ringkas.totalSisa), tahunLulusOptions: tahun.map((t) => Number(t.tahun)) },
  };
};

/** Tahun pada tagihan yang dibuat / ditimpa saat generate. */
const tahunTagihanBaru = () => new Date().getFullYear();

/** Tarif wisuda: kode biaya berawalan W, mis. W2026 (huruf besar/kecil & spasi tepi diabaikan). */
const tarifWisuda = (where = {}) =>
  TarifLain.findAll({
    where: { [Op.and]: [sequelize.where(sequelize.fn('UPPER', sequelize.fn('TRIM', sequelize.col('kode_biaya'))), { [Op.like]: 'W%' }), where] },
    order: [['tahunMasuk', 'DESC']],
  });

/** Pilihan popup Generate Tagihan: tarif wisuda aktif. */
const opsiGenerate = async () => {
  const tarif = await tarifWisuda({ isActive: true });
  return { tarif: tarif.map((t) => ({ id: t.id, kodeBiaya: t.kodeBiaya, keterangan: t.keterangan, biaya: t.biaya })) };
};

// Tagihan wisuda hanya untuk mahasiswa aktif semester 5 ke atas.
const SEMESTER_MIN_WISUDA = 5;

/**
 * Generate tagihan dari tarif terpilih untuk mahasiswa aktif semester >= 5. Satu mahasiswa punya satu tagihan: generate ulang
 * menimpa tagihan lama dengan tarif terpilih (mis. tarif tahun berikutnya naik), kecuali yang sudah lunas. Jadwal cicilan
 * tagihan yang ditimpa dihapus karena tidak lagi sama dengan total. pratinjau = hanya menghitung.
 * mahasiswaIds (opsional) membatasi ke mahasiswa tertentu.
 */
const generateTagihanWisuda = async ({ tarifLainId, pratinjau = false, mahasiswaIds, cicilan } = {}, actorId) => {
  const [tarif] = await tarifWisuda({ id: tarifLainId, isActive: true });
  if (!tarif) throw new ApiError(400, 'Tarif wisuda aktif tidak ditemukan. Isi di Master > Tarif Biaya Lain dengan Kode Biaya berawalan W, mis. W2026.');
  const tahunAktif = await TahunAjaran.findOne({ where: { isActive: true } });
  if (!tahunAktif) throw new ApiError(400, 'Belum ada tahun ajaran aktif');
  const tahun = tahunTagihanBaru();

  const mahasiswa = await Mahasiswa.findAll({
    where: { isActive: true, statusKeluar: null, ...(mahasiswaIds?.length ? { id: mahasiswaIds } : {}) },
    attributes: ['id', 'tahunMasuk', 'statusMasuk', 'semesterDiakui', 'jumlahSemesterCuti', 'semesterOverride'],
    include: [{ model: TahunAjaran, as: 'tahunAjaran', attributes: ['jenisSemester'], required: false }],
  });
  const targetIds = mahasiswa.filter((m) => resolveSemesterMahasiswa(m, tahunAktif) >= SEMESTER_MIN_WISUDA).map((m) => m.id);

  let hasil;
  let cicilanDibuat = 0;
  await sequelize.transaction(async (transaction) => {
    const tagihanList = targetIds.length
      ? await TagihanWisuda.findAll({
          where: { mahasiswaId: targetIds },
          include: [{ model: PembayaranWisuda, as: 'pembayaranList', attributes: ['bayar'] }],
          order: [['tahun', 'ASC']],
          transaction,
        })
      : [];
    const tagihanOf = new Map(tagihanList.map((t) => [t.mahasiswaId, t]));
    const baru = targetIds.filter((id) => !tagihanOf.has(id));
    const dibayarOf = (t) => t.pembayaranList.reduce((n, p) => n + p.bayar, 0);
    const lama = [...tagihanOf.values()];
    const lunas = lama.filter((t) => dibayarOf(t) >= t.totalTagihan && t.totalTagihan > 0);
    const diubah = lama.filter((t) => !lunas.includes(t) && (t.totalTagihan !== tarif.biaya || t.tarifLainId !== tarif.id));
    const diubahSudahBayar = diubah.filter((t) => dibayarOf(t) > 0).length;

    if (!pratinjau) {
      if (baru.length) {
        await TagihanWisuda.bulkCreate(
          baru.map((mahasiswaId) => ({ mahasiswaId, tarifLainId: tarif.id, kodeBiaya: tarif.kodeBiaya, tahun, keterangan: tarif.keterangan, totalTagihan: tarif.biaya, createdBy: actorId, updatedBy: actorId })),
          { transaction }
        );
      }
      if (diubah.length) {
        const ids = diubah.map((t) => t.id);
        await TagihanWisuda.update({ tarifLainId: tarif.id, kodeBiaya: tarif.kodeBiaya, tahun, keterangan: tarif.keterangan, totalTagihan: tarif.biaya, updatedBy: actorId }, { where: { id: ids }, transaction });
        await TagihanWisudaCicilan.destroy({ where: { tagihanWisudaId: ids }, transaction });
      }
      if (cicilan && targetIds.length) {
        const calon = await sequelize.query(
          `SELECT t.id, t.total_tagihan AS total FROM tagihan_wisuda t
            WHERE t.mahasiswa_id IN (:ids)
              AND NOT EXISTS (SELECT 1 FROM tagihan_wisuda_cicilan c WHERE c.tagihan_wisuda_id = t.id)
              AND NOT EXISTS (SELECT 1 FROM pembayaran_wisuda p WHERE p.tagihan_wisuda_id = t.id)`,
          { replacements: { ids: targetIds }, type: sequelize.QueryTypes.SELECT, transaction }
        );
        const baris = calon.flatMap((t) =>
          bagiRata(Number(t.total), cicilan.jumlahBulan).map((n, i) => {
            const periode = tambahBulan(cicilan.bulanMulai, i);
            return { tagihanWisudaId: t.id, cicilanKe: i + 1, periode, nominal: n, tanggalJatuhTempo: jatuhTempoBulan(periode, cicilan.hariJatuhTempo), createdBy: actorId, updatedBy: actorId };
          })
        );
        if (baris.length) await TagihanWisudaCicilan.bulkCreate(baris, { transaction });
        cicilanDibuat = calon.length;
      }
    }
    hasil = { baru: baru.length, diubah: diubah.length, diubahSudahBayar, lunas: lunas.length, sudahAda: lama.length - diubah.length };
  });
  return { pratinjau, cicilanDibuat, jumlahTarget: targetIds.length, tarif: { id: tarif.id, kodeBiaya: tarif.kodeBiaya, keterangan: tarif.keterangan, biaya: tarif.biaya }, ...hasil };
};

const muatTagihanCicilan = async (id) => {
  const tagihan = await TagihanWisuda.findByPk(id, {
    include: [
      { model: Mahasiswa, as: 'mahasiswa', attributes: ['id', 'nim', 'namaLengkap'] },
      { model: PembayaranWisuda, as: 'pembayaranList', attributes: ['bayar'] },
      { model: TagihanWisudaCicilan, as: 'cicilanList' },
    ],
  });
  if (!tagihan) throw new ApiError(404, 'Tagihan wisuda tidak ditemukan');
  return tagihan;
};

/** Cicilan satu tagihan, bentuk sama dengan cicilan tagihan kuliah (dipakai modal bersama). */
const getCicilanWisuda = async (id) => {
  const tagihan = await muatTagihanCicilan(id);
  const totalDibayar = tagihan.pembayaranList.reduce((n, p) => n + p.bayar, 0);
  return {
    tagihan: {
      id: tagihan.id,
      semester: null,
      tahunAjaran: tagihan.keterangan || `Wisuda ${tagihan.tahun}`,
      mahasiswa: tagihan.mahasiswa,
      noVirtualAccount: null,
      tanggalJatuhTempo: null,
      totalTagihan: tagihan.totalTagihan,
      totalDibayar,
      sisaTagihan: Math.max(tagihan.totalTagihan - totalDibayar, 0),
    },
    cicilan: alokasiCicilan(tagihan.cicilanList, totalDibayar),
  };
};

/** Simpan (ganti seluruh) jadwal cicilan; items kosong = hapus jadwal (dibayar bebas). */
const saveCicilanWisuda = async (id, items, actorId) => {
  const tagihan = await muatTagihanCicilan(id);
  const rows = [...items].sort((a, b) => String(a.periode).localeCompare(String(b.periode)));
  if (new Set(rows.map((r) => String(r.periode).slice(0, 7))).size !== rows.length) throw new ApiError(400, 'Bulan cicilan tidak boleh ada yang sama');
  if (rows.length) {
    const jumlah = rows.reduce((n, r) => n + Number(r.nominal), 0);
    if (Math.round(jumlah) !== Math.round(tagihan.totalTagihan)) {
      throw new ApiError(400, `Jumlah nominal cicilan (${jumlah.toLocaleString('id-ID')}) harus sama dengan total tagihan (${tagihan.totalTagihan.toLocaleString('id-ID')})`);
    }
  }
  await sequelize.transaction(async (transaction) => {
    await TagihanWisudaCicilan.destroy({ where: { tagihanWisudaId: tagihan.id }, transaction });
    if (rows.length) {
      await TagihanWisudaCicilan.bulkCreate(
        rows.map((r, i) => ({
          tagihanWisudaId: tagihan.id,
          cicilanKe: i + 1,
          periode: `${String(r.periode).slice(0, 7)}-01`,
          nominal: r.nominal,
          tanggalJatuhTempo: r.tanggalJatuhTempo || null,
          noVirtualAccount: r.noVirtualAccount || null,
          keterangan: r.keterangan || null,
          createdBy: actorId,
          updatedBy: actorId,
        })),
        { transaction }
      );
    }
  });
  return getCicilanWisuda(id);
};

/** Id mahasiswa yang punya cicilan wisuda belum lunas & lewat jatuh tempo, untuk laporan tunggakan. */
const buildWisudaTerlambatSet = async () => {
  const list = await TagihanWisuda.findAll({
    include: [{ model: PembayaranWisuda, as: 'pembayaranList', attributes: ['bayar'] }, { model: TagihanWisudaCicilan, as: 'cicilanList', required: true }],
  });
  return new Set(list.filter((t) => alokasiCicilan(t.cicilanList, t.pembayaranList.reduce((n, p) => n + p.bayar, 0)).some((c) => c.terlambat)).map((t) => t.mahasiswaId));
};

const STATUS_PORTAL = { LUNAS: 'LUNAS', SEBAGIAN: 'BELUM_LUNAS', BELUM_BAYAR: 'BELUM_BAYAR' };

/** Tagihan wisuda milik satu mahasiswa untuk portal: total, sisa, jadwal cicilan & riwayat bayar. */
const tagihanWisudaMahasiswa = async (mahasiswaId) => {
  const list = await TagihanWisuda.findAll({
    where: { mahasiswaId },
    include: [{ model: PembayaranWisuda, as: 'pembayaranList' }, { model: TagihanWisudaCicilan, as: 'cicilanList' }],
    order: [['tahun', 'DESC']],
  });
  return list.map((t) => {
    const totalDibayar = t.pembayaranList.reduce((n, p) => n + p.bayar, 0);
    const sisaTagihan = Math.max(t.totalTagihan - totalDibayar, 0);
    return {
      id: t.id,
      tahun: t.tahun,
      keterangan: t.keterangan,
      totalTagihan: t.totalTagihan,
      totalDibayar,
      sisaTagihan,
      status: sisaTagihan <= 0 ? 'LUNAS' : totalDibayar > 0 ? 'BELUM_LUNAS' : 'BELUM_BAYAR',
      cicilan: alokasiCicilan(t.cicilanList, totalDibayar).map((c) => ({
        cicilanKe: c.cicilanKe,
        periode: c.periode,
        nominal: c.nominal,
        dibayar: c.dibayar,
        sisa: c.sisa,
        tanggalJatuhTempo: c.tanggalJatuhTempo,
        noVirtualAccount: c.noVirtualAccount,
        status: STATUS_PORTAL[c.status],
        terlambat: c.terlambat,
      })),
      pembayaran: [...t.pembayaranList]
        .sort((a, b) => String(b.tanggalBayar).localeCompare(String(a.tanggalBayar)) || b.id - a.id)
        .map((p) => ({ id: p.id, tanggalBayar: p.tanggalBayar, noBukti: p.noBukti, nominal: p.bayar, kodeBank: p.kodeBank })),
    };
  });
};

/** Peta mahasiswaId -> sisa tagihan wisuda (hanya yang masih bersisa), untuk laporan tunggakan. */
const buildSisaWisudaMap = async ({ mahasiswaId } = {}) => {
  const rows = await sequelize.query(
    `SELECT t.mahasiswa_id AS id, SUM(t.total_tagihan) - COALESCE(MAX(b.total), 0) AS sisa
       FROM tagihan_wisuda t
       LEFT JOIN (SELECT mahasiswa_id, SUM(bayar) AS total FROM pembayaran_wisuda GROUP BY mahasiswa_id) b ON b.mahasiswa_id = t.mahasiswa_id
      ${mahasiswaId ? 'WHERE t.mahasiswa_id IN (:ids)' : ''}
      GROUP BY t.mahasiswa_id`,
    { replacements: { ids: [mahasiswaId].flat() }, type: sequelize.QueryTypes.SELECT }
  );
  return new Map(rows.filter((r) => Number(r.sisa) > 0).map((r) => [Number(r.id), Number(r.sisa)]));
};

/** Tagihan hasil generate milik satu mahasiswa, untuk form pembayaran (jenis pembayaran mengikuti tagihan ini). */
const opsiTagihanMahasiswa = async (mahasiswaId) => {
  const tagihan = await TagihanWisuda.findAll({
    where: { mahasiswaId },
    include: [{ model: PembayaranWisuda, as: 'pembayaranList', attributes: ['bayar'] }, { model: TagihanWisudaCicilan, as: 'cicilanList' }],
    order: [['tahun', 'DESC']],
  });
  return tagihan.map((t) => {
    const dibayar = t.pembayaranList.reduce((n, p) => n + p.bayar, 0);
    const jadwal = ringkasanCicilan(t.cicilanList, dibayar);
    return {
      tagihanWisudaId: t.id,
      tahun: t.tahun,
      keterangan: t.keterangan,
      total: t.totalTagihan,
      dibayar,
      sisa: Math.max(t.totalTagihan - dibayar, 0),
      // Cicilan berikutnya yang harus dibayar (null = tanpa jadwal / sudah lunas).
      jumlahCicilan: jadwal?.jumlah ?? 0,
      cicilanLunas: jadwal?.lunas ?? 0,
      cicilanBerikutnya: jadwal?.berikutnya ?? null,
    };
  });
};

const getPembayaranWisudaById = async (id) => {
  const item = await PembayaranWisuda.findByPk(id);
  if (!item) throw new ApiError(404, 'Data pembayaran wisuda tidak ditemukan');
  return item;
};

const resolveMahasiswaId = async (nim) => {
  const mahasiswa = await Mahasiswa.findOne({ where: { nim } });
  if (!mahasiswa) throw new ApiError(404, `Mahasiswa dengan NIM "${nim}" tidak ditemukan`);
  return mahasiswa.id;
};

/** Pembayaran selalu masuk ke tagihan hasil generate; mahasiswa tanpa tagihan tidak bisa membayar. */
const createPembayaranWisuda = async (payload, actorId) => {
  const { nim, ...rest } = payload;
  const mahasiswaId = await resolveMahasiswaId(nim);
  // Semester otomatis: semester mahasiswa pada tahun ajaran aktif saat pembayaran dicatat.
  const [mahasiswa, tahunAktif] = await Promise.all([
    Mahasiswa.findByPk(mahasiswaId, { include: [{ model: TahunAjaran, as: 'tahunAjaran', attributes: ['jenisSemester'], required: false }] }),
    TahunAjaran.findOne({ where: { isActive: true } }),
  ]);
  const semester = tahunAktif ? resolveSemesterMahasiswa(mahasiswa, tahunAktif) : null;
  const tagihan = await TagihanWisuda.findOne({ where: { mahasiswaId }, order: [['tahun', 'DESC']] });
  if (!tagihan) throw new ApiError(400, 'Mahasiswa ini belum punya tagihan wisuda. Buat dulu lewat Generate Tagihan.');
  const item = await sequelize.transaction(async (transaction) => {
    await tagihan.reload({ transaction, lock: transaction.LOCK.UPDATE });
    const dibayar = (await PembayaranWisuda.sum('bayar', { where: { tagihanWisudaId: tagihan.id }, transaction })) || 0;
    const sisa = Math.max(tagihan.totalTagihan - Number(dibayar), 0);
    if (sisa <= 0) throw new ApiError(400, 'Tagihan wisuda ini sudah lunas');
    if (Number(payload.bayar) > sisa) throw new ApiError(400, `Pembayaran melebihi sisa tagihan (Rp ${sisa.toLocaleString('id-ID')})`);
    return PembayaranWisuda.create(
      { ...rest, semester, mahasiswaId, tagihanWisudaId: tagihan.id, periode: `${tagihan.tahun}/${tagihan.tahun + 1}`, createdBy: actorId, updatedBy: actorId },
      { transaction }
    );
  });

  const akunKas = await getAkunByKode('1-1001');
  const akunPendapatan = await getAkunByKode('4-1003');
  await postJurnal({
    tanggal: payload.tanggalBayar,
    noBukti: payload.noBukti,
    keterangan: `Pembayaran wisuda - ${nim}`,
    referensiTipe: 'PEMBAYARAN_WISUDA',
    referensiId: item.id,
    createdBy: actorId,
    lines: [
      { akunId: akunKas.id, debit: payload.bayar, kredit: 0 },
      { akunId: akunPendapatan.id, debit: 0, kredit: payload.bayar },
    ],
  });

  return item;
};

/** Data kwitansi satu pembayaran wisuda; akumulasi s.d. pembayaran ini, supaya kwitansi lama tetap sama isinya. */
const getKwitansiWisuda = async (id) => {
  const item = await PembayaranWisuda.findByPk(id, { include: [{ model: User, as: 'creator', attributes: ['name'], required: false }] });
  if (!item) throw new ApiError(404, 'Data pembayaran wisuda tidak ditemukan');
  const mahasiswa = await Mahasiswa.findByPk(item.mahasiswaId, {
    attributes: ['nim', 'namaLengkap'],
    include: [{ model: Jurusan, as: 'jurusan', attributes: ['namaJurusan'], required: false }],
  });
  const tagihan = item.tagihanWisudaId ? await TagihanWisuda.findByPk(item.tagihanWisudaId) : null;
  const semua = tagihan ? await PembayaranWisuda.findAll({ where: { tagihanWisudaId: tagihan.id }, attributes: ['id', 'tanggalBayar', 'bayar'] }) : [item];
  const urut = semua.sort((a, b) => String(a.tanggalBayar).localeCompare(String(b.tanggalBayar)) || a.id - b.id);
  const ke = urut.findIndex((p) => p.id === item.id) + 1;
  const dibayarSampaiIni = urut.slice(0, ke).reduce((n, p) => n + Number(p.bayar), 0);
  const totalTagihan = tagihan?.totalTagihan ?? Number(item.bayar);
  const nama = tagihan?.keterangan || 'Biaya Wisuda';
  return {
    judul: 'KWITANSI PEMBAYARAN WISUDA',
    nomorKwitansi: `KW-WIS/${String(item.tanggalBayar).slice(0, 4)}/${String(item.id).padStart(6, '0')}`,
    untukPembayaran: `${nama} (pembayaran ke-${ke})`,
    labelTotal: 'Total tagihan wisuda',
    tanggalBayar: item.tanggalBayar,
    noBukti: item.noBukti,
    nominal: Number(item.bayar),
    kodeBank: item.kodeBank,
    petugas: item.creator?.name ?? null,
    mahasiswa: { nim: mahasiswa?.nim ?? '-', namaLengkap: mahasiswa?.namaLengkap ?? '-', prodi: mahasiswa?.jurusan?.namaJurusan ?? '-' },
    tagihan: { totalTagihan, dibayarSampaiIni, sisaSetelahIni: Math.max(totalTagihan - dibayarSampaiIni, 0) },
  };
};

const deletePembayaranWisuda = async (id) => {
  const item = await getPembayaranWisudaById(id);
  // Jurnal Kas/Pendapatan ikut dihapus supaya buku besar tidak menyimpan jurnal yatim.
  await sequelize.transaction(async (transaction) => {
    await hapusJurnalReferensi('PEMBAYARAN_WISUDA', item.id, transaction);
    await item.destroy({ transaction });
  });
};

module.exports = {
  listMahasiswaWisuda,
  generateTagihanWisuda,
  opsiGenerate,
  opsiTagihanMahasiswa,
  buildSisaWisudaMap,
  buildWisudaTerlambatSet,
  getCicilanWisuda,
  saveCicilanWisuda,
  tagihanWisudaMahasiswa,
  listPembayaranWisuda,
  getPembayaranWisudaById,
  createPembayaranWisuda,
  getKwitansiWisuda,
  deletePembayaranWisuda,
};
