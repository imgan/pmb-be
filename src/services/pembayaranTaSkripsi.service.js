const { Op } = require('sequelize');
const {
  sequelize,
  PembayaranTaSkripsi,
  PerpanjanganTaSkripsi,
  Mahasiswa,
  Jurusan,
  TarifTaSkripsi,
  TahunTaSkripsi,
  TahunAjaran,
  TagihanTaSkripsi,
  TagihanTaSkripsiCicilan,
  User,
} = require('../models');
const ApiError = require('../utils/ApiError');
const { getPagination, getPagingMeta } = require('../utils/pagination');
const { postJurnal, getAkunByKode, hapusJurnalReferensi } = require('./jurnal.service');
const { alokasiCicilan, ringkasanCicilan, bagiRata, tambahBulan, jatuhTempoBulan } = require('../utils/tagihanCicilan');
const { resolveSemesterMahasiswa } = require('../utils/hitungSemester');

/**
 * Pembayaran TA/Skripsi mengikuti pola Pembayaran Wisuda: Generate Tagihan membuat satu tagihan per mahasiswa dari biaya
 * pendaftaran Tarif TA/Skripsi prodinya, lalu pembayaran dicatat ke tagihan itu dan boleh dicicil (opsional dengan jadwal
 * cicilan bulanan). Perpanjangan TA/Skripsi tetap transaksi terpisah (tarif biaya perpanjangan).
 *
 * Tarif dicocokkan lewat kode prodi, bukan id jurusan: satu prodi punya beberapa baris jurusan (golongan kelas) dan tarif
 * bisa tersimpan di baris yang berbeda dengan jurusan mahasiswa.
 */

const totalBayar = (list) => list.reduce((n, p) => n + Number(p.nominal), 0);

// ---------- Daftar mahasiswa + status tagihan ----------

const SISA = 'COALESCE(t.tagihan, 0) - COALESCE(b.total, 0)';
const SYARAT_STATUS = {
  LUNAS: `COALESCE(t.tagihan, 0) > 0 AND ${SISA} = 0`,
  // Dibayar melebihi tagihan, mis. setelah tarif diturunkan.
  LEBIH_BAYAR: `COALESCE(t.tagihan, 0) > 0 AND ${SISA} < 0`,
  SEBAGIAN: `${SISA} > 0 AND COALESCE(b.total, 0) > 0`,
  BELUM: `${SISA} > 0 AND COALESCE(b.total, 0) = 0`,
  BELUM_DITAGIH: 'COALESCE(t.tagihan, 0) = 0',
  TUNGGAKAN: `${SISA} > 0`,
};
const statusBaris = (tagihan, total) =>
  tagihan <= 0 ? 'BELUM_DITAGIH' : total > tagihan ? 'LEBIH_BAYAR' : total === tagihan ? 'LUNAS' : total > 0 ? 'SEBAGIAN' : 'BELUM';
const lebihBayar = (tagihan, dibayar) => (tagihan > 0 ? Math.max(dibayar - tagihan, 0) : 0);

/** Daftar mahasiswa untuk menu Pembayaran TA/Skripsi + tagihan, dibayar & sisa. Filter: search, statusBayar, kodeProdi. */
const listMahasiswaTa = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const syarat = [];
  const replacements = { limit, offset };
  const kata = String(query.search ?? '').trim();
  if (kata) {
    syarat.push('(m.nim LIKE :kata OR m.nama_lengkap LIKE :kata)');
    replacements.kata = `%${kata}%`;
  }
  if (SYARAT_STATUS[query.statusBayar]) syarat.push(SYARAT_STATUS[query.statusBayar]);
  if (query.kodeProdi) {
    syarat.push('j.kode_prodi = :kodeProdi');
    replacements.kodeProdi = String(query.kodeProdi);
  }
  const dari = `FROM mahasiswa m
    LEFT JOIN jurusan j ON j.id = m.jurusan_id
    LEFT JOIN (SELECT mahasiswa_id, SUM(total_tagihan) AS tagihan, GROUP_CONCAT(DISTINCT COALESCE(keterangan, periode) SEPARATOR ', ') AS periode FROM tagihan_ta_skripsi GROUP BY mahasiswa_id) t ON t.mahasiswa_id = m.id
    LEFT JOIN (SELECT mahasiswa_id, SUM(nominal) AS total FROM pembayaran_ta_skripsi WHERE tagihan_ta_skripsi_id IS NOT NULL GROUP BY mahasiswa_id) b ON b.mahasiswa_id = m.id
    ${syarat.length ? `WHERE ${syarat.join(' AND ')}` : ''}`;
  const pilih = { replacements, type: sequelize.QueryTypes.SELECT };
  const urut = query.statusBayar === 'TUNGGAKAN' ? `${SISA} DESC, m.id DESC` : 'm.id DESC';
  const [rows, [ringkas]] = await Promise.all([
    sequelize.query(
      `SELECT m.id, m.nim, m.nama_lengkap AS namaLengkap, m.tahun_masuk AS tahunMasuk, j.nama_jurusan AS namaJurusan,
              t.periode, COALESCE(t.tagihan, 0) AS tagihan, COALESCE(b.total, 0) AS dibayar
       ${dari} ORDER BY ${urut} LIMIT :limit OFFSET :offset`,
      pilih
    ),
    sequelize.query(`SELECT COUNT(*) AS total, COALESCE(SUM(GREATEST(${SISA}, 0)), 0) AS totalSisa ${dari}`, pilih),
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
        periode: r.periode ?? null,
        tagihan,
        dibayar,
        sisa: Math.max(tagihan - dibayar, 0),
        lebihBayar: lebihBayar(tagihan, dibayar),
        status: statusBaris(tagihan, dibayar),
      };
    }),
    meta: { ...getPagingMeta(Number(ringkas.total), page, limit), totalSisa: Number(ringkas.totalSisa) },
  };
};

// ---------- Generate tagihan ----------

// Tagihan TA/Skripsi untuk mahasiswa aktif semester 5 ke atas (sama dengan tagihan wisuda).
const SEMESTER_MIN_TA = 5;

/** Tarif aktif satu Tahun TA/Skripsi, dipetakan per kode prodi. */
const tarifPerProdi = async (tahunTaSkripsiId) => {
  const list = await TarifTaSkripsi.findAll({
    where: { tahunTaSkripsiId, isActive: true },
    include: [{ model: Jurusan, as: 'jurusan', attributes: ['id', 'kodeProdi', 'namaJurusan'] }],
    order: [['id', 'ASC']],
  });
  const map = new Map();
  list.forEach((t) => {
    const kode = t.jurusan?.kodeProdi;
    if (kode && !map.has(kode)) map.set(kode, t);
  });
  return map;
};

/** Pilihan popup Generate Tagihan: Tahun TA/Skripsi yang punya tarif aktif, beserta tarif per prodi. */
const opsiGenerate = async () => {
  const tarif = await TarifTaSkripsi.findAll({
    where: { isActive: true, tahunTaSkripsiId: { [Op.ne]: null } },
    include: [
      { model: Jurusan, as: 'jurusan', attributes: ['kodeProdi', 'namaJurusan'] },
      { model: TahunTaSkripsi, as: 'tahunTaSkripsi', attributes: ['id', 'nama', 'jenisSemester', 'isActive'] },
    ],
    order: [['periode', 'DESC'], ['id', 'ASC']],
  });
  const perTahun = new Map();
  tarif.forEach((t) => {
    if (!t.tahunTaSkripsi) return;
    if (!perTahun.has(t.tahunTaSkripsiId)) {
      const th = t.tahunTaSkripsi;
      perTahun.set(t.tahunTaSkripsiId, { id: th.id, nama: `${th.nama} ${th.jenisSemester ?? ''}`.trim(), isActive: th.isActive, periode: t.periode, tarif: [] });
    }
    const entry = perTahun.get(t.tahunTaSkripsiId);
    if (!entry.tarif.some((x) => x.kodeProdi === t.jurusan?.kodeProdi)) {
      entry.tarif.push({ kodeProdi: t.jurusan?.kodeProdi ?? null, prodi: t.jurusan?.namaJurusan ?? '-', biaya: t.biayaPendaftaran });
    }
  });
  return { tahun: [...perTahun.values()] };
};

/**
 * Generate tagihan TA/Skripsi untuk mahasiswa aktif semester >= 5 dari tarif Tahun TA/Skripsi terpilih (biaya pendaftaran
 * prodi masing-masing). Satu mahasiswa satu tagihan: generate ulang menimpa tagihan lama yang belum lunas (mis. tarif
 * berubah) dan menghapus jadwal cicilannya; yang sudah lunas tidak disentuh. Mahasiswa yang prodinya belum punya tarif
 * dilewati. pratinjau = hanya menghitung.
 */
const generateTagihanTa = async ({ tahunTaSkripsiId, pratinjau = false, mahasiswaIds, cicilan } = {}, actorId) => {
  const tahunTa = await TahunTaSkripsi.findByPk(tahunTaSkripsiId);
  if (!tahunTa) throw new ApiError(404, 'Tahun TA/Skripsi tidak ditemukan');
  const tarifOf = await tarifPerProdi(tahunTa.id);
  if (!tarifOf.size) throw new ApiError(400, 'Belum ada tarif TA/Skripsi aktif untuk tahun ini. Isi di Master → Tarif TA/Skripsi.');
  const tahunAktif = await TahunAjaran.findOne({ where: { isActive: true } });
  if (!tahunAktif) throw new ApiError(400, 'Belum ada tahun ajaran aktif');

  const mahasiswa = await Mahasiswa.findAll({
    where: { isActive: true, statusKeluar: null, ...(mahasiswaIds?.length ? { id: mahasiswaIds } : {}) },
    attributes: ['id', 'jurusanId', 'tahunMasuk', 'statusMasuk', 'semesterDiakui', 'jumlahSemesterCuti', 'semesterOverride'],
    include: [
      { model: TahunAjaran, as: 'tahunAjaran', attributes: ['jenisSemester'], required: false },
      { model: Jurusan, as: 'jurusan', attributes: ['kodeProdi'], required: false },
    ],
  });
  const target = mahasiswa.filter((m) => resolveSemesterMahasiswa(m, tahunAktif) >= SEMESTER_MIN_TA);
  const tanpaTarif = target.filter((m) => !tarifOf.has(m.jurusan?.kodeProdi));
  const bertarif = target.filter((m) => tarifOf.has(m.jurusan?.kodeProdi));
  const tarifMahasiswa = new Map(bertarif.map((m) => [m.id, tarifOf.get(m.jurusan.kodeProdi)]));
  const targetIds = bertarif.map((m) => m.id);
  const keterangan = `TA/Skripsi ${tahunTa.nama}${tahunTa.jenisSemester ? ` ${tahunTa.jenisSemester}` : ''}`;
  const isiTagihan = (tarif) => ({ tarifTaSkripsiId: tarif.id, tahunTaSkripsiId: tahunTa.id, periode: tarif.periode, keterangan, totalTagihan: tarif.biayaPendaftaran });

  let hasil;
  let cicilanDibuat = 0;
  await sequelize.transaction(async (transaction) => {
    const tagihanList = targetIds.length
      ? await TagihanTaSkripsi.findAll({
          where: { mahasiswaId: targetIds },
          include: [{ model: PembayaranTaSkripsi, as: 'pembayaranList', attributes: ['nominal'] }],
          transaction,
        })
      : [];
    const tagihanOf = new Map(tagihanList.map((t) => [t.mahasiswaId, t]));
    const baru = targetIds.filter((id) => !tagihanOf.has(id));
    const lama = [...tagihanOf.values()];
    const lunas = lama.filter((t) => t.totalTagihan > 0 && totalBayar(t.pembayaranList) >= t.totalTagihan);
    const diubah = lama.filter((t) => {
      if (lunas.includes(t)) return false;
      const tarif = tarifMahasiswa.get(t.mahasiswaId);
      return t.totalTagihan !== tarif.biayaPendaftaran || t.tarifTaSkripsiId !== tarif.id || t.tahunTaSkripsiId !== tahunTa.id;
    });
    const diubahSudahBayar = diubah.filter((t) => totalBayar(t.pembayaranList) > 0).length;

    if (!pratinjau) {
      if (baru.length) {
        await TagihanTaSkripsi.bulkCreate(
          baru.map((mahasiswaId) => ({ mahasiswaId, ...isiTagihan(tarifMahasiswa.get(mahasiswaId)), createdBy: actorId, updatedBy: actorId })),
          { transaction }
        );
      }
      for (const t of diubah) {
        await t.update({ ...isiTagihan(tarifMahasiswa.get(t.mahasiswaId)), updatedBy: actorId }, { transaction });
      }
      if (diubah.length) await TagihanTaSkripsiCicilan.destroy({ where: { tagihanTaSkripsiId: diubah.map((t) => t.id) }, transaction });
      if (cicilan && targetIds.length) {
        const calon = await sequelize.query(
          `SELECT t.id, t.total_tagihan AS total FROM tagihan_ta_skripsi t
            WHERE t.mahasiswa_id IN (:ids)
              AND NOT EXISTS (SELECT 1 FROM tagihan_ta_skripsi_cicilan c WHERE c.tagihan_ta_skripsi_id = t.id)
              AND NOT EXISTS (SELECT 1 FROM pembayaran_ta_skripsi p WHERE p.tagihan_ta_skripsi_id = t.id)`,
          { replacements: { ids: targetIds }, type: sequelize.QueryTypes.SELECT, transaction }
        );
        const baris = calon.flatMap((t) =>
          bagiRata(Number(t.total), cicilan.jumlahBulan).map((n, i) => {
            const periode = tambahBulan(cicilan.bulanMulai, i);
            return { tagihanTaSkripsiId: t.id, cicilanKe: i + 1, periode, nominal: n, tanggalJatuhTempo: jatuhTempoBulan(periode, cicilan.hariJatuhTempo), createdBy: actorId, updatedBy: actorId };
          })
        );
        if (baris.length) await TagihanTaSkripsiCicilan.bulkCreate(baris, { transaction });
        cicilanDibuat = calon.length;
      }
    }
    hasil = { baru: baru.length, diubah: diubah.length, diubahSudahBayar, lunas: lunas.length, sudahAda: lama.length - diubah.length };
  });

  return {
    pratinjau,
    cicilanDibuat,
    jumlahTarget: targetIds.length,
    tanpaTarif: tanpaTarif.length,
    tahun: { id: tahunTa.id, nama: keterangan },
    tarif: [...tarifOf.values()].map((t) => ({ prodi: t.jurusan?.namaJurusan ?? '-', biaya: t.biayaPendaftaran, jumlah: bertarif.filter((m) => tarifMahasiswa.get(m.id) === t).length })),
    ...hasil,
  };
};

/**
 * Tarif TA/Skripsi diubah: semua tagihan hasil generate dari tarif ini ditimpa ke biaya pendaftaran yang baru, termasuk
 * yang sudah lunas (kelebihannya tampil sebagai "lebih bayar"). Jadwal cicilan dibagi ulang rata dengan bulan, jatuh
 * tempo & VA yang sama. Mengembalikan jumlah tagihan yang berubah.
 */
const selaraskanTagihanDariTarif = async (tarifId, actorId) => {
  const tarif = await TarifTaSkripsi.findByPk(tarifId);
  if (!tarif) return 0;
  const tagihanList = await TagihanTaSkripsi.findAll({
    where: { tarifTaSkripsiId: tarif.id, totalTagihan: { [Op.ne]: tarif.biayaPendaftaran } },
    include: [{ model: TagihanTaSkripsiCicilan, as: 'cicilanList' }],
  });
  if (!tagihanList.length) return 0;
  await sequelize.transaction(async (transaction) => {
    for (const t of tagihanList) {
      await t.update({ totalTagihan: tarif.biayaPendaftaran, periode: tarif.periode, updatedBy: actorId }, { transaction });
      const jadwal = [...t.cicilanList].sort((a, b) => a.cicilanKe - b.cicilanKe);
      const nominal = bagiRata(tarif.biayaPendaftaran, jadwal.length);
      for (const [i, c] of jadwal.entries()) await c.update({ nominal: nominal[i], updatedBy: actorId }, { transaction });
    }
  });
  return tagihanList.length;
};

// ---------- Jadwal cicilan ----------

const muatTagihanCicilan = async (id) => {
  const tagihan = await TagihanTaSkripsi.findByPk(id, {
    include: [
      { model: Mahasiswa, as: 'mahasiswa', attributes: ['id', 'nim', 'namaLengkap'] },
      { model: PembayaranTaSkripsi, as: 'pembayaranList', attributes: ['nominal'] },
      { model: TagihanTaSkripsiCicilan, as: 'cicilanList' },
    ],
  });
  if (!tagihan) throw new ApiError(404, 'Tagihan TA/Skripsi tidak ditemukan');
  return tagihan;
};

/** Cicilan satu tagihan, bentuk sama dengan cicilan tagihan kuliah (dipakai modal bersama). */
const getCicilanTa = async (id) => {
  const tagihan = await muatTagihanCicilan(id);
  const totalDibayar = totalBayar(tagihan.pembayaranList);
  return {
    tagihan: {
      id: tagihan.id,
      semester: null,
      tahunAjaran: tagihan.keterangan || `TA/Skripsi ${tagihan.periode}`,
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
const saveCicilanTa = async (id, items, actorId) => {
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
    await TagihanTaSkripsiCicilan.destroy({ where: { tagihanTaSkripsiId: tagihan.id }, transaction });
    if (rows.length) {
      await TagihanTaSkripsiCicilan.bulkCreate(
        rows.map((r, i) => ({
          tagihanTaSkripsiId: tagihan.id,
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
  return getCicilanTa(id);
};

/** Id mahasiswa yang punya cicilan TA/Skripsi belum lunas & lewat jatuh tempo, untuk laporan tunggakan. */
const buildTaTerlambatSet = async () => {
  const list = await TagihanTaSkripsi.findAll({
    include: [
      { model: PembayaranTaSkripsi, as: 'pembayaranList', attributes: ['nominal'] },
      { model: TagihanTaSkripsiCicilan, as: 'cicilanList', required: true },
    ],
  });
  return new Set(list.filter((t) => alokasiCicilan(t.cicilanList, totalBayar(t.pembayaranList)).some((c) => c.terlambat)).map((t) => t.mahasiswaId));
};

const STATUS_PORTAL = { LUNAS: 'LUNAS', SEBAGIAN: 'BELUM_LUNAS', BELUM_BAYAR: 'BELUM_BAYAR' };

/** Tagihan TA/Skripsi milik satu mahasiswa untuk portal: total, sisa, jadwal cicilan & riwayat bayar (bentuk = tagihan wisuda). */
const tagihanTaMahasiswa = async (mahasiswaId) => {
  const list = await TagihanTaSkripsi.findAll({
    where: { mahasiswaId },
    include: [{ model: PembayaranTaSkripsi, as: 'pembayaranList' }, { model: TagihanTaSkripsiCicilan, as: 'cicilanList' }],
  });
  return list.map((t) => {
    const totalDibayar = totalBayar(t.pembayaranList);
    const sisaTagihan = Math.max(t.totalTagihan - totalDibayar, 0);
    return {
      id: t.id,
      tahun: t.periode,
      keterangan: t.keterangan,
      totalTagihan: t.totalTagihan,
      totalDibayar,
      sisaTagihan,
      lebihBayar: lebihBayar(t.totalTagihan, totalDibayar),
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
        .map((p) => ({ id: p.id, tanggalBayar: p.tanggalBayar, noBukti: p.noBukti, nominal: p.nominal, kodeBank: p.kodeBank })),
    };
  });
};

/** Tagihan hasil generate milik satu mahasiswa, untuk form pembayaran (jenis pembayaran mengikuti tagihan ini). */
const opsiTagihanMahasiswa = async (mahasiswaId) => {
  const tagihan = await TagihanTaSkripsi.findAll({
    where: { mahasiswaId },
    include: [{ model: PembayaranTaSkripsi, as: 'pembayaranList', attributes: ['nominal'] }, { model: TagihanTaSkripsiCicilan, as: 'cicilanList' }],
  });
  return tagihan.map((t) => {
    const dibayar = totalBayar(t.pembayaranList);
    const jadwal = ringkasanCicilan(t.cicilanList, dibayar);
    return {
      tagihanTaSkripsiId: t.id,
      periode: t.periode,
      keterangan: t.keterangan,
      total: t.totalTagihan,
      dibayar,
      sisa: Math.max(t.totalTagihan - dibayar, 0),
      lebihBayar: lebihBayar(t.totalTagihan, dibayar),
      jumlahCicilan: jadwal?.jumlah ?? 0,
      cicilanLunas: jadwal?.lunas ?? 0,
      cicilanBerikutnya: jadwal?.berikutnya ?? null,
    };
  });
};

// ---------- Transaksi pembayaran ----------

const listPembayaran = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const where = {};
  if (query.mahasiswaId) where.mahasiswaId = query.mahasiswaId;
  const mahasiswaWhere = {};
  if (query.search) {
    mahasiswaWhere[Op.or] = [{ nim: { [Op.like]: `%${query.search}%` } }, { namaLengkap: { [Op.like]: `%${query.search}%` } }];
  }

  const { rows, count } = await PembayaranTaSkripsi.findAndCountAll({
    where,
    include: [
      {
        model: Mahasiswa,
        as: 'mahasiswa',
        required: true,
        where: Reflect.ownKeys(mahasiswaWhere).length ? mahasiswaWhere : undefined,
        include: [{ model: Jurusan, as: 'jurusan' }],
      },
    ],
    limit,
    offset,
    order: [['tanggalBayar', 'DESC'], ['id', 'DESC']],
    subQuery: false,
    distinct: true,
  });

  return { data: rows, meta: getPagingMeta(count, page, limit) };
};

/** Pembayaran selalu masuk ke tagihan hasil generate; mahasiswa tanpa tagihan tidak bisa membayar. */
const createPembayaran = async (payload, actorId) => {
  const { mahasiswaId } = payload;
  const [mahasiswa, tahunAktif] = await Promise.all([
    Mahasiswa.findByPk(mahasiswaId, { include: [{ model: TahunAjaran, as: 'tahunAjaran', attributes: ['jenisSemester'], required: false }] }),
    TahunAjaran.findOne({ where: { isActive: true } }),
  ]);
  if (!mahasiswa) throw new ApiError(404, 'Mahasiswa tidak ditemukan');
  // Semester otomatis: semester mahasiswa pada tahun ajaran aktif saat pembayaran dicatat.
  const semester = tahunAktif ? resolveSemesterMahasiswa(mahasiswa, tahunAktif) : null;
  const tagihan = await TagihanTaSkripsi.findOne({ where: { mahasiswaId } });
  if (!tagihan) throw new ApiError(400, 'Mahasiswa ini belum punya tagihan TA/Skripsi. Buat dulu lewat Generate Tagihan di menu Pembayaran TA/Skripsi.');

  const item = await sequelize.transaction(async (transaction) => {
    await tagihan.reload({ transaction, lock: transaction.LOCK.UPDATE });
    const dibayar = (await PembayaranTaSkripsi.sum('nominal', { where: { tagihanTaSkripsiId: tagihan.id }, transaction })) || 0;
    const sisa = Math.max(tagihan.totalTagihan - Number(dibayar), 0);
    if (sisa <= 0) {
      const lebih = lebihBayar(tagihan.totalTagihan, Number(dibayar));
      throw new ApiError(400, `Tagihan TA/Skripsi ini sudah lunas${lebih ? ` (lebih bayar Rp ${lebih.toLocaleString('id-ID')})` : ''}`);
    }
    if (Number(payload.nominal) > sisa) throw new ApiError(400, `Pembayaran melebihi sisa tagihan (Rp ${sisa.toLocaleString('id-ID')})`);
    return PembayaranTaSkripsi.create(
      {
        mahasiswaId,
        tagihanTaSkripsiId: tagihan.id,
        periode: tagihan.periode,
        semester,
        tanggalBayar: payload.tanggalBayar,
        noBukti: payload.noBukti,
        nominal: payload.nominal,
        kodeBank: payload.kodeBank || null,
        keterangan: payload.keterangan || null,
        createdBy: actorId,
        updatedBy: actorId,
      },
      { transaction }
    );
  });

  const akunKas = await getAkunByKode('1-1001');
  const akunPendapatan = await getAkunByKode('4-1004');
  await postJurnal({
    tanggal: payload.tanggalBayar,
    noBukti: payload.noBukti,
    keterangan: `Pembayaran TA/Skripsi - ${mahasiswa.nim}`,
    referensiTipe: 'PEMBAYARAN_TA_SKRIPSI',
    referensiId: item.id,
    createdBy: actorId,
    lines: [
      { akunId: akunKas.id, debit: payload.nominal, kredit: 0 },
      { akunId: akunPendapatan.id, debit: 0, kredit: payload.nominal },
    ],
  });

  return PembayaranTaSkripsi.findByPk(item.id, { include: [{ model: Mahasiswa, as: 'mahasiswa', include: [{ model: Jurusan, as: 'jurusan' }] }] });
};

/** Data kwitansi satu pembayaran TA/Skripsi; akumulasi s.d. pembayaran ini, supaya kwitansi lama tetap sama isinya. */
const getKwitansiTa = async (id) => {
  const item = await PembayaranTaSkripsi.findByPk(id, { include: [{ model: User, as: 'creator', attributes: ['name'], required: false }] });
  if (!item) throw new ApiError(404, 'Data pembayaran TA/Skripsi tidak ditemukan');
  const mahasiswa = await Mahasiswa.findByPk(item.mahasiswaId, {
    attributes: ['nim', 'namaLengkap'],
    include: [{ model: Jurusan, as: 'jurusan', attributes: ['namaJurusan'], required: false }],
  });
  const tagihan = item.tagihanTaSkripsiId ? await TagihanTaSkripsi.findByPk(item.tagihanTaSkripsiId) : null;
  const semua = tagihan ? await PembayaranTaSkripsi.findAll({ where: { tagihanTaSkripsiId: tagihan.id }, attributes: ['id', 'tanggalBayar', 'nominal'] }) : [item];
  const urut = semua.sort((a, b) => String(a.tanggalBayar).localeCompare(String(b.tanggalBayar)) || a.id - b.id);
  const ke = urut.findIndex((p) => p.id === item.id) + 1;
  const dibayarSampaiIni = urut.slice(0, ke).reduce((n, p) => n + Number(p.nominal), 0);
  const totalTagihan = tagihan?.totalTagihan ?? Number(item.nominal);
  const nama = tagihan?.keterangan || `TA/Skripsi ${item.periode}`;
  return {
    judul: 'KWITANSI PEMBAYARAN TA/SKRIPSI',
    nomorKwitansi: `KW-TA/${String(item.tanggalBayar).slice(0, 4)}/${String(item.id).padStart(6, '0')}`,
    untukPembayaran: `Biaya ${nama} (pembayaran ke-${ke})`,
    labelTotal: 'Total tagihan TA/Skripsi',
    tanggalBayar: item.tanggalBayar,
    noBukti: item.noBukti,
    nominal: Number(item.nominal),
    kodeBank: item.kodeBank,
    keterangan: item.keterangan,
    petugas: item.creator?.name ?? null,
    mahasiswa: { nim: mahasiswa?.nim ?? '-', namaLengkap: mahasiswa?.namaLengkap ?? '-', prodi: mahasiswa?.jurusan?.namaJurusan ?? '-' },
    tagihan: { totalTagihan, dibayarSampaiIni, sisaSetelahIni: Math.max(totalTagihan - dibayarSampaiIni, 0), lebihBayar: lebihBayar(totalTagihan, dibayarSampaiIni) },
  };
};

const deletePembayaran = async (id) => {
  const item = await PembayaranTaSkripsi.findByPk(id);
  if (!item) throw new ApiError(404, 'Data pembayaran tidak ditemukan');
  // Jurnal Kas/Pendapatan ikut dihapus supaya buku besar tidak menyimpan jurnal yatim.
  await sequelize.transaction(async (transaction) => {
    await hapusJurnalReferensi('PEMBAYARAN_TA_SKRIPSI', item.id, transaction);
    await item.destroy({ transaction });
  });
};

// ---------- Ringkasan untuk laporan tunggakan & bebas tunggakan ----------

/** Tarif perpanjangan per (kode prodi | periode): dicocokkan lewat kode prodi, lihat catatan di atas. */
const petaTarifPerpanjangan = async () => {
  const list = await TarifTaSkripsi.findAll({ include: [{ model: Jurusan, as: 'jurusan', attributes: ['kodeProdi'] }] });
  const map = new Map();
  list.forEach((t) => {
    const key = `${t.jurusan?.kodeProdi}|${t.periode}`;
    if (!map.has(key)) map.set(key, Number(t.biayaPerpanjangan) || 0);
  });
  return map;
};

/**
 * Rincian tagihan TA/Skripsi per periode untuk satu mahasiswa: pendaftaran dari tagihan hasil generate (total vs
 * pembayaran tagihan itu) dan, kalau pernah perpanjangan, tarif perpanjangan vs yang dibayar. Dipakai laporan Tunggakan,
 * form pembayaran di Pembayaran Kuliah, dan surat bebas tunggakan.
 */
const getRingkasanTaSkripsiByMahasiswaId = async (mahasiswaId) => {
  const mahasiswa = await Mahasiswa.findByPk(mahasiswaId, { include: [{ model: Jurusan, as: 'jurusan', attributes: ['kodeProdi'] }] });
  if (!mahasiswa) return [];

  const [tagihanList, pembayaranList, perpanjanganList] = await Promise.all([
    TagihanTaSkripsi.findAll({ where: { mahasiswaId } }),
    PembayaranTaSkripsi.findAll({ where: { mahasiswaId }, order: [['tanggalBayar', 'ASC']] }),
    PerpanjanganTaSkripsi.findAll({ where: { mahasiswaId }, order: [['tanggalBayar', 'ASC']] }),
  ]);
  if (!tagihanList.length && !pembayaranList.length && !perpanjanganList.length) return [];

  const tarifPerpanjangan = perpanjanganList.length ? await petaTarifPerpanjangan() : new Map();
  const periodeTagihan = new Map(tagihanList.map((t) => [t.id, t.periode]));
  // Pembayaran ikut periode tagihannya (tagihan bisa ditimpa ke tahun lain saat generate ulang).
  const periodeBayar = (p) => periodeTagihan.get(p.tagihanTaSkripsiId) ?? p.periode;
  const periodeSet = new Set([...tagihanList.map((t) => t.periode), ...pembayaranList.map(periodeBayar), ...perpanjanganList.map((p) => p.periode)]);

  return [...periodeSet]
    .sort((a, b) => a - b)
    .map((periode) => {
      const tagihanPeriode = tagihanList.filter((t) => t.periode === periode);
      const pembayaranPeriode = pembayaranList.filter((p) => periodeBayar(p) === periode);
      const perpanjanganPeriode = perpanjanganList.filter((p) => p.periode === periode);

      const pendaftaranTarif = tagihanPeriode.reduce((n, t) => n + t.totalTagihan, 0);
      const pendaftaranDibayar = totalBayar(pembayaranPeriode);
      const perpanjanganTarif = tarifPerpanjangan.get(`${mahasiswa.jurusan?.kodeProdi}|${periode}`) ?? 0;
      const perpanjanganDibayar = totalBayar(perpanjanganPeriode);

      return {
        periode,
        mahasiswaId: mahasiswa.id,
        pendaftaran: { tarif: pendaftaranTarif, dibayar: pendaftaranDibayar, sisa: Math.max(pendaftaranTarif - pendaftaranDibayar, 0) },
        perpanjangan: perpanjanganPeriode.length
          ? { tarif: perpanjanganTarif, dibayar: perpanjanganDibayar, sisa: Math.max(perpanjanganTarif - perpanjanganDibayar, 0) }
          : null,
        pembayaranList: pembayaranPeriode,
        perpanjanganList: perpanjanganPeriode,
      };
    });
};

const getRingkasanTaSkripsiByNim = async (nim) => {
  const mahasiswa = await Mahasiswa.findOne({ where: { nim } });
  if (!mahasiswa) return [];
  return getRingkasanTaSkripsiByMahasiswaId(mahasiswa.id);
};

/**
 * Peta mahasiswaId -> total sisa tagihan TA/Skripsi: sisa tagihan pendaftaran hasil generate + sisa perpanjangan (tarif
 * perpanjangan periode yang pernah dibayar). Dipakai laporan Tunggakan supaya tidak query per mahasiswa.
 */
const buildSisaTaSkripsiMap = async ({ mahasiswaId } = {}) => {
  const where = mahasiswaId ? { mahasiswaId } : {};
  const [tagihanList, perpanjanganList] = await Promise.all([
    TagihanTaSkripsi.findAll({ where, include: [{ model: PembayaranTaSkripsi, as: 'pembayaranList', attributes: ['nominal'] }] }),
    PerpanjanganTaSkripsi.findAll({ where, attributes: ['mahasiswaId', 'periode', 'nominal'], raw: true }),
  ]);
  const result = new Map();
  const tambah = (id, n) => {
    if (n > 0) result.set(id, (result.get(id) ?? 0) + n);
  };
  tagihanList.forEach((t) => tambah(t.mahasiswaId, t.totalTagihan - totalBayar(t.pembayaranList)));

  if (perpanjanganList.length) {
    const ids = [...new Set(perpanjanganList.map((p) => p.mahasiswaId))];
    const [mahasiswaList, tarifPerpanjangan] = await Promise.all([
      Mahasiswa.findAll({ where: { id: ids }, attributes: ['id'], include: [{ model: Jurusan, as: 'jurusan', attributes: ['kodeProdi'] }] }),
      petaTarifPerpanjangan(),
    ]);
    const kodeOf = new Map(mahasiswaList.map((m) => [m.id, m.jurusan?.kodeProdi]));
    const dibayar = new Map();
    perpanjanganList.forEach((p) => {
      const key = `${p.mahasiswaId}|${p.periode}`;
      dibayar.set(key, (dibayar.get(key) ?? 0) + Number(p.nominal));
    });
    dibayar.forEach((n, key) => {
      const [id, periode] = key.split('|');
      tambah(Number(id), (tarifPerpanjangan.get(`${kodeOf.get(Number(id))}|${periode}`) ?? 0) - n);
    });
  }
  return result;
};

module.exports = {
  listMahasiswaTa,
  opsiGenerate,
  generateTagihanTa,
  selaraskanTagihanDariTarif,
  getCicilanTa,
  saveCicilanTa,
  buildTaTerlambatSet,
  tagihanTaMahasiswa,
  opsiTagihanMahasiswa,
  listPembayaran,
  createPembayaran,
  getKwitansiTa,
  deletePembayaran,
  getRingkasanTaSkripsiByMahasiswaId,
  getRingkasanTaSkripsiByNim,
  buildSisaTaSkripsiMap,
};
