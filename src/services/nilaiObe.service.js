const { sequelize, NilaiMahasiswa, NilaiKomponenObe, MataKuliah, TahunAjaran, Cpmk } = require('../models');
const ApiError = require('../utils/ApiError');
const { gradeFor } = require('../utils/gradeScale');
const bobotObeService = require('./bobotObe.service');
const { komposisiDariRps } = require('./kelasKuliah.service');
const dosenKelasService = require('./dosenKelas.service');

/**
 * Input Nilai kelas OBE (portal dosen), berbasis CPMK: kolom nilai = komponen Komposisi Nilai Kelas (bobot_obe;
 * metode "1" / sub metode "1.2") × CPMK yang diukurnya, masing-masing dengan bobot terhadap nilai akhir (lihat kolomDari). Detail disimpan di nilai_komponen_obe;
 * ringkasan per jenis (rata-rata berbobot komponen sejenis) ditulis ke nilai_mahasiswa sehingga
 * Σ jenis × bobot jenis = Σ komponen × bobot efektif (nilai akhir & KHS konsisten dengan alur lama).
 */
const round2 = (v) => Math.round(Number(v) * 100) / 100;
const KOMPONEN = bobotObeService.KOMPONEN_OBE;

/** Bagi bobot rata ke n bagian (2 desimal); sisa pembulatan ke bagian terakhir. */
const bagiRata = (total, n) => {
  const rata = Math.floor((total * 100) / n) / 100;
  return Array.from({ length: n }, (_, i) => (i === n - 1 ? round2(total - rata * (n - 1)) : rata));
};

/**
 * Kolom input nilai OBE = komponen (metode tanpa sub "1" / sub metode "1.2") × CPMK yang diukurnya; kunci sel
 * "1|<cpmkId>" / "1.2|<cpmkId>", bobot = % nilai akhir.
 * - Komposisi memetakan nilai CPMK pada metode tsb → satu kolom per CPMK berbobot > 0.
 * - Belum dipetakan tetapi MK punya CPMK → bobot komponen dibagi rata ke CPMK MK (`cpmkRata`).
 * - MK tanpa CPMK → satu kolom per komponen (kunci tanpa CPMK).
 */
const kolomDari = (komponenEvaluasi = [], cpmkList = []) => {
  const kodeCpmk = new Map(cpmkList.map((c) => [String(c.id), c.kode]));
  let cpmkRata = false;
  const kolom = komponenEvaluasi.flatMap((k, i) => {
    const leaves = k.sub?.length
      ? k.sub.map((s, j) => ({ komponen: `${i + 1}.${j + 1}`, nama: s.nama, bobot: round2((k.bobot * s.bobot) / 100), cpmk: s.cpmk }))
      : [{ komponen: `${i + 1}`, nama: null, bobot: round2(k.bobot), cpmk: k.cpmk }];
    const dipetakan = leaves.some((l) => Object.values(l.cpmk ?? {}).some((v) => Number(v) > 0));
    const dasar = { metode: k.metode, jenis: k.jenis, syaratLulus: !!k.syaratLulus };
    return leaves.flatMap((l) => {
      if (dipetakan) {
        return Object.entries(l.cpmk ?? {})
          .filter(([, v]) => Number(v) > 0)
          .map(([cpmkId, v]) => ({ ...dasar, kunci: `${l.komponen}|${cpmkId}`, komponen: l.komponen, nama: l.nama, cpmkId: Number(cpmkId), cpmkKode: kodeCpmk.get(cpmkId) ?? `CPMK ${cpmkId}`, bobot: round2(v) }));
      }
      if (cpmkList.length) {
        cpmkRata = true;
        const bagian = bagiRata(l.bobot, cpmkList.length);
        return cpmkList.map((c, x) => ({ ...dasar, kunci: `${l.komponen}|${c.id}`, komponen: l.komponen, nama: l.nama, cpmkId: c.id, cpmkKode: c.kode, bobot: bagian[x] }));
      }
      return [{ ...dasar, kunci: l.komponen, komponen: l.komponen, nama: l.nama, cpmkId: null, cpmkKode: null, bobot: l.bobot }];
    });
  });
  return { kolom, cpmkRata };
};

/** CPMK mata kuliah sesuai level Pemetaan CPMK (CPMK induk / Sub-CPMK). */
const cpmkMataKuliah = async (mataKuliahId) => {
  if (!mataKuliahId) return [];
  const mk = await MataKuliah.unscoped().findByPk(mataKuliahId, { attributes: ['levelPemetaanCpmk'] });
  const semua = await Cpmk.findAll({ where: { mataKuliahId }, attributes: ['id', 'kode', 'parentId', 'deskripsi'], order: [['kode', 'ASC'], ['id', 'ASC']] });
  const induk = semua.filter((c) => !c.parentId);
  const list =
    mk?.levelPemetaanCpmk === 'SUB_CPMK'
      ? induk.flatMap((c) => {
          const sub = semua.filter((x) => x.parentId === c.id);
          return sub.length ? sub : [c];
        })
      : induk;
  return list.map((c) => ({ id: c.id, kode: c.kode, deskripsi: c.deskripsi }));
};

const kelasObe = async (jadwal) => {
  if (!jadwal.mataKuliahId) return false;
  const mk = await MataKuliah.unscoped().findByPk(jadwal.mataKuliahId, { attributes: ['isObe'] });
  return !!mk?.isObe;
};

/** Bentuk ringkas komposisi untuk membandingkan RPS dengan komposisi kelas. */
const sidik = (list = []) =>
  JSON.stringify(
    list.map((k) => ({
      m: k.metode,
      j: k.jenis,
      b: round2(k.bobot),
      c: Object.entries(k.cpmk ?? {}).filter(([, v]) => Number(v) > 0).map(([id, v]) => [id, round2(v)]).sort(),
      s: (k.sub ?? []).map((x) => ({ n: x.nama, b: round2(x.bobot), c: Object.entries(x.cpmk ?? {}).filter(([, v]) => Number(v) > 0).map(([id, v]) => [id, round2(v)]).sort() })),
    }))
  );

/**
 * Komposisi yang berlaku untuk input nilai kelas OBE — dokumen terbaru menang: Rencana Evaluasi RPS (periode
 * berlaku ≤ periode kelas) bila diubah setelah komposisi kelas (atau komposisi kelas belum ada); selain itu
 * komposisi kelas (mis. disesuaikan prodi setelah RPS). `perluSinkron` = komposisi kelas akan diselaraskan ke
 * RPS saat nilai disimpan.
 */
const komposisiBerlaku = async (jadwal, isObe) => {
  const komposisi = await bobotObeService.getBobot(jadwal.id);
  const rps = isObe ? await komposisiDariRps(jadwal.mataKuliahId, await TahunAjaran.findByPk(jadwal.tahunAjaranId)) : null;
  const adaRps = !!rps?.komponenEvaluasi.length;
  const rpsLebihBaru = adaRps && (!komposisi || new Date(rps.diperbarui) > new Date(komposisi.updatedAt));
  const beda = adaRps && sidik(rps.komponenEvaluasi) !== sidik(komposisi?.komponenEvaluasi);
  const pakaiRps = rpsLebihBaru && beda;
  return {
    komposisi,
    komponenEvaluasi: pakaiRps ? rps.komponenEvaluasi : (komposisi?.komponenEvaluasi ?? []),
    sumber: pakaiRps ? 'RPS' : komposisi ? 'KELAS' : null,
    perluSinkron: pakaiRps,
    adaKomposisiRps: adaRps,
    periodeRps: rps?.periode ?? null,
  };
};

/** Data input nilai OBE satu kelas: isObe, komposisi berlaku, kolom (komponen × CPMK), mahasiswa + nilai per sel. */
const getNilaiObe = async (dosenId, jadwalKuliahId) => {
  const jadwal = await dosenKelasService.ensureKelasDosen(jadwalKuliahId, dosenId);
  const isObe = await kelasObe(jadwal);
  const berlaku = await komposisiBerlaku(jadwal, isObe);
  const komposisi = berlaku.komponenEvaluasi.length ? { ...(berlaku.komposisi ?? {}), komponenEvaluasi: berlaku.komponenEvaluasi } : null;
  const cpmk = await cpmkMataKuliah(jadwal.mataKuliahId);
  const { kolom, cpmkRata } = kolomDari(berlaku.komponenEvaluasi, cpmk);
  const dasar = await dosenKelasService.getNilaiKelas(dosenId, jadwal.id);
  const detail = dasar.mahasiswa.length
    ? await NilaiKomponenObe.findAll({ where: { jadwalKuliahId: jadwal.id, mahasiswaId: dasar.mahasiswa.map((m) => m.mahasiswaId) } })
    : [];
  const detailBy = new Map();
  detail.forEach((d) => detailBy.set(`${d.mahasiswaId}|${d.kunci}`, d.nilai));
  return {
    isObe,
    kelas: dasar.kelas,
    komposisi,
    kolom,
    cpmk,
    // true = komposisi belum memetakan nilai CPMK; bobot komponen dibagi rata ke CPMK mata kuliah.
    cpmkRata,
    // KELAS = komposisi kelas; RPS = mengikuti Rencana Evaluasi RPS yang lebih baru (diselaraskan saat simpan).
    sumber: berlaku.sumber,
    perluSinkron: berlaku.perluSinkron,
    adaKomposisiRps: berlaku.adaKomposisiRps,
    periodeRps: berlaku.periodeRps,
    mahasiswa: dasar.mahasiswa.map((m) => ({
      no: m.no,
      mahasiswaId: m.mahasiswaId,
      nim: m.nim,
      namaLengkap: m.namaLengkap,
      nilaiKomponen: Object.fromEntries(kolom.map((k) => [k.kunci, detailBy.get(`${m.mahasiswaId}|${k.kunci}`) ?? null])),
      nilai: m.nilai,
      grade: m.grade,
    })),
  };
};

/** Simpan nilai per komponen; ringkasan per jenis + nilai akhir & huruf ditulis ke nilai_mahasiswa. */
const saveNilaiObe = async (dosenId, jadwalKuliahId, items) => {
  const jadwal = await dosenKelasService.ensureKelasDosen(jadwalKuliahId, dosenId);
  if (!(await kelasObe(jadwal))) throw new ApiError(400, 'Mata kuliah kelas ini bukan OBE; gunakan input nilai biasa');
  const berlaku = await komposisiBerlaku(jadwal, true);
  if (!berlaku.komponenEvaluasi.length) throw new ApiError(400, 'Komposisi nilai kelas belum diisi');
  // RPS lebih baru: komposisi kelas diselaraskan dulu (nilai lama dihitung ulang dengan bobot baru).
  if (berlaku.perluSinkron) await bobotObeService.simpanBobot(jadwal.id, { komponenEvaluasi: berlaku.komponenEvaluasi }, { dosenId });
  const { kolom } = kolomDari(berlaku.komponenEvaluasi, await cpmkMataKuliah(jadwal.mataKuliahId));
  const dasar = await dosenKelasService.getNilaiKelas(dosenId, jadwal.id);
  const roster = new Map(dasar.mahasiswa.map((m) => [m.mahasiswaId, m]));
  const asing = items.find((it) => !roster.has(Number(it.mahasiswaId)));
  if (asing) throw new ApiError(400, `Mahasiswa id ${asing.mahasiswaId} bukan peserta kelas ini`);

  await sequelize.transaction(async (transaction) => {
    for (const it of items) {
      const m = roster.get(Number(it.mahasiswaId));
      const nilaiKomp = Object.fromEntries(
        kolom.map((k) => {
          const v = it.nilai?.[k.kunci];
          return [k.kunci, v === null || v === undefined || v === '' ? null : Math.min(Math.max(Number(v) || 0, 0), 100)];
        })
      );
      // Detail per komponen (kosong = dihapus).
      await NilaiKomponenObe.destroy({ where: { jadwalKuliahId: jadwal.id, mahasiswaId: m.mahasiswaId }, transaction });
      const isi = kolom.filter((k) => nilaiKomp[k.kunci] !== null);
      if (isi.length) {
        await NilaiKomponenObe.bulkCreate(
          isi.map((k) => ({ jadwalKuliahId: jadwal.id, mahasiswaId: m.mahasiswaId, kunci: k.kunci, nilai: round2(nilaiKomp[k.kunci]) })),
          { transaction }
        );
      }
      // Ringkasan per jenis = rata-rata berbobot komponen sejenis (kosong dihitung 0).
      const existing = await NilaiMahasiswa.findOne({
        where: { mahasiswaId: m.mahasiswaId, kodeMataKuliah: jadwal.kodeMataKuliah, semester: m.semester },
        transaction,
      });
      const jenis = Object.fromEntries(
        KOMPONEN.map((j) => {
          const kol = kolom.filter((k) => k.jenis === j);
          const totalBobot = kol.reduce((s, k) => s + k.bobot, 0);
          if (!totalBobot) return [j, existing ? Number(existing[j]) || 0 : 0];
          return [j, round2(kol.reduce((s, k) => s + (nilaiKomp[k.kunci] ?? 0) * k.bobot, 0) / totalBobot)];
        })
      );
      const nilai = round2(kolom.reduce((s, k) => s + ((nilaiKomp[k.kunci] ?? 0) * k.bobot) / 100, 0));
      const data = { ...jenis, nilai, grade: gradeFor(nilai), namaMataKuliah: jadwal.namaMataKuliah, sks: jadwal.sks ?? 0 };
      if (existing) await existing.update(data, { transaction });
      else await NilaiMahasiswa.create({ ...data, mahasiswaId: m.mahasiswaId, kodeMataKuliah: jadwal.kodeMataKuliah, semester: m.semester }, { transaction });
    }
  });
  return getNilaiObe(dosenId, jadwal.id);
};

/** Isi Komposisi Nilai Kelas dari Rencana Evaluasi RPS (bila komposisi kelas belum ada). */
const komposisiDariRpsKelas = async (dosenId, jadwalKuliahId) => {
  const jadwal = await dosenKelasService.ensureKelasDosen(jadwalKuliahId, dosenId);
  if (await bobotObeService.getBobot(jadwal.id)) throw new ApiError(400, 'Komposisi nilai kelas sudah diisi');
  const rps = await komposisiDariRps(jadwal.mataKuliahId, await TahunAjaran.findByPk(jadwal.tahunAjaranId));
  if (!rps.komponenEvaluasi.length) throw new ApiError(400, 'Rencana Evaluasi RPS mata kuliah ini belum diisi');
  await bobotObeService.simpanBobot(jadwal.id, { komponenEvaluasi: rps.komponenEvaluasi }, { dosenId });
  return getNilaiObe(dosenId, jadwal.id);
};

module.exports = { kolomDari, cpmkMataKuliah, getNilaiObe, saveNilaiObe, komposisiDariRpsKelas };
