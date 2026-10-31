const { sequelize, Jurusan, Kurikulum, Cpl, Cpmk, MataKuliah, BobotObe } = require('../models');
const ApiError = require('../utils/ApiError');
const { kolomDari } = require('./nilaiObe.service');

/**
 * Prodi → Laporan → Laporan OBE (Monitoring OBE). Capaian dihitung dari nilai Input Nilai OBE dosen
 * (nilai_komponen_obe, kunci "<komponen>|<cpmkId>") berbobot sesuai Komposisi Nilai Kelas (bobot_obe):
 *   1. Nilai CPMK mahasiswa per kelas = Σ(nilai × bobot komponen) ÷ Σ bobot, per CPMK.
 *   2. Metode: RERATA = rata-rata semua kelas yang pernah diambil (termasuk mengulang);
 *              PROGRESIF = hanya kelas periode terakhir per mata kuliah (perbaikan nilai menggantikan yang lama).
 *   3. Nilai CPL mahasiswa = rata-rata berbobot nilai CPMK yang dipetakan ke CPL (cpmk_cpl.bobot; IK digulung
 *      ke CPL induknya; bobot 0 semua → rata biasa).
 * Jenis laporan: CPL per Program Studi, CPL per Mahasiswa, CPMK per Mata Kuliah, CPMK per Mahasiswa (satu mata kuliah).
 */
const JENIS = ['cpl-prodi', 'cpl-mahasiswa', 'cpmk-mk', 'cpmk-mahasiswa'];
const METODE = ['rerata', 'progresif'];
const round2 = (v) => Math.round(Number(v) * 100) / 100;
const rata = (list) => (list.length ? round2(list.reduce((s, v) => s + v, 0) / list.length) : null);
const rataBerbobot = (pairs) => {
  const pakai = pairs.filter(([n]) => n !== null && n !== undefined);
  if (!pakai.length) return null;
  const totalBobot = pakai.reduce((s, [, b]) => s + b, 0);
  if (totalBobot <= 0) return rata(pakai.map(([n]) => n));
  return round2(pakai.reduce((s, [n, b]) => s + n * b, 0) / totalBobot);
};
const q = (sql, replacements) => sequelize.query(sql, { replacements, type: sequelize.QueryTypes.SELECT });
const lingkup = (jurusanId) => (jurusanId ? [].concat(jurusanId).map(Number) : null);

/** Kode prodi yang boleh diakses (scope prodi sesi). */
const kodeProdiScope = async (jurusanId) => {
  const ids = lingkup(jurusanId);
  if (!ids) return null;
  return [...new Set((await Jurusan.findAll({ where: { id: ids }, attributes: ['kodeProdi'], raw: true })).map((j) => j.kodeProdi).filter(Boolean))];
};

/** Pilihan filter: prodi (per kode prodi), tahun kurikulum per prodi, angkatan per prodi. */
const filterOptions = async (jurusanId) => {
  const scope = await kodeProdiScope(jurusanId);
  const kur = await q(
    `SELECT DISTINCT j.kode_prodi AS kodeProdi, j.nama_jurusan AS nama, j.jenjang_pendidikan AS jenjang, k.tahun_kurikulum AS tahun
       FROM kurikulum k JOIN jurusan j ON j.id = k.jurusan_id
      WHERE k.is_delete = 0 AND j.kode_prodi IS NOT NULL ${scope ? 'AND j.kode_prodi IN (:scope)' : ''}
      ORDER BY j.nama_jurusan, k.tahun_kurikulum DESC`,
    { scope }
  );
  const angkatan = await q(
    `SELECT DISTINCT j.kode_prodi AS kodeProdi, m.tahun_masuk AS tahun
       FROM mahasiswa m JOIN jurusan j ON j.id = m.jurusan_id
      WHERE j.kode_prodi IS NOT NULL ${scope ? 'AND j.kode_prodi IN (:scope)' : ''}
      ORDER BY m.tahun_masuk DESC`,
    { scope }
  );
  const prodi = new Map();
  kur.forEach((r) => {
    if (!prodi.has(r.kodeProdi)) prodi.set(r.kodeProdi, { kodeProdi: r.kodeProdi, nama: [r.jenjang, r.nama].filter(Boolean).join(' - '), tahunKurikulum: [], angkatan: [] });
    const p = prodi.get(r.kodeProdi);
    if (r.tahun && !p.tahunKurikulum.includes(r.tahun)) p.tahunKurikulum.push(r.tahun);
  });
  angkatan.forEach((r) => {
    const p = prodi.get(r.kodeProdi);
    if (p && r.tahun && !p.angkatan.includes(r.tahun)) p.angkatan.push(r.tahun);
  });
  return { jenis: JENIS, metode: METODE, prodi: [...prodi.values()] };
};

/**
 * Hitung capaian. Kembalikan struktur sesuai jenis laporan beserta konteks (prodi, kurikulum, angkatan, metode).
 */
const generate = async ({ jenis = 'cpl-prodi', tahunKurikulum, kodeProdi, angkatan, metode = 'rerata', mataKuliahId }, jurusanId) => {
  if (!JENIS.includes(jenis)) throw new ApiError(400, 'Jenis laporan tidak valid');
  if (!METODE.includes(metode)) throw new ApiError(400, 'Metode perhitungan tidak valid');
  if (!kodeProdi) throw new ApiError(400, 'Program studi wajib dipilih');
  if (!tahunKurikulum) throw new ApiError(400, 'Tahun kurikulum wajib dipilih');
  const perMk = jenis === 'cpmk-mahasiswa';
  if (perMk && !Number(mataKuliahId)) throw new ApiError(400, 'Mata kuliah wajib dipilih');
  const scope = await kodeProdiScope(jurusanId);
  if (scope && !scope.includes(String(kodeProdi))) throw new ApiError(403, 'Program studi ini bukan milik prodi Anda');

  const jurusanIds = (await Jurusan.findAll({ where: { kodeProdi: String(kodeProdi) }, attributes: ['id', 'namaJurusan', 'jenjangPendidikan'], raw: true }));
  if (!jurusanIds.length) throw new ApiError(404, 'Program studi tidak ditemukan');
  const kurikulum = await Kurikulum.findAll({ where: { jurusanId: jurusanIds.map((j) => j.id), tahunKurikulum: Number(tahunKurikulum) } });
  if (!kurikulum.length) throw new ApiError(404, 'Kurikulum tidak ditemukan untuk program studi & tahun tersebut');
  const kurIds = kurikulum.map((k) => k.id);

  const [cplList, mkList] = await Promise.all([
    Cpl.findAll({ where: { kurikulumId: kurIds }, order: [['kode', 'ASC'], ['id', 'ASC']] }),
    // CPMK per Mahasiswa: hanya mata kuliah terpilih (harus milik kurikulum ini).
    MataKuliah.findAll({ where: { kurikulumId: kurIds, ...(perMk ? { id: Number(mataKuliahId) } : {}) }, order: [['semester', 'ASC'], ['kode', 'ASC']] }),
  ]);
  if (perMk && !mkList.length) throw new ApiError(404, 'Mata kuliah tidak ditemukan pada kurikulum ini');
  const mkIds = mkList.map((m) => m.id);
  const cpmkList = mkIds.length ? await Cpmk.findAll({ where: { mataKuliahId: mkIds }, order: [['kode', 'ASC'], ['id', 'ASC']] }) : [];
  const cpmkById = new Map(cpmkList.map((c) => [c.id, c]));
  const indukCpl = new Map(cplList.map((c) => [c.id, c.parentId ?? c.id]));
  const cplInduk = cplList.filter((c) => !c.parentId);
  const peta = cpmkList.length
    ? await q('SELECT cpmk_id AS cpmkId, cpl_id AS cplId, bobot FROM cpmk_cpl WHERE cpmk_id IN (:ids)', { ids: cpmkList.map((c) => c.id) })
    : [];

  // Kelas mata kuliah kurikulum ini beserta urutan periodenya.
  const jadwal = mkIds.length
    ? await q(
        `SELECT j.id, j.mata_kuliah_id AS mataKuliahId, j.kelas, t.tahun_mulai * 10 + IF(t.jenis_semester = 'GENAP', 2, 1) AS urut
           FROM jadwal_kuliah j LEFT JOIN tahun_ajaran t ON t.id = j.tahun_ajaran_id
          WHERE j.mata_kuliah_id IN (:mkIds)`,
        { mkIds }
      )
    : [];
  const jadwalById = new Map(jadwal.map((j) => [Number(j.id), { ...j, mataKuliahId: Number(j.mataKuliahId), urut: Number(j.urut ?? 0) }]));

  // Mahasiswa prodi (+ angkatan) yang punya nilai komponen OBE di kelas-kelas tsb.
  const nilai = jadwal.length
    ? await q(
        `SELECT n.jadwal_kuliah_id AS jadwalId, n.mahasiswa_id AS mahasiswaId, n.kunci, n.nilai
           FROM nilai_komponen_obe n JOIN mahasiswa m ON m.id = n.mahasiswa_id
          WHERE n.jadwal_kuliah_id IN (:jadwalIds) AND m.jurusan_id IN (:jurusanIds) ${angkatan ? 'AND m.tahun_masuk = :angkatan' : ''}`,
        { jadwalIds: jadwal.map((j) => j.id), jurusanIds: jurusanIds.map((j) => j.id), angkatan: Number(angkatan) || null }
      )
    : [];

  // Bobot tiap kunci per kelas dari Komposisi Nilai Kelas.
  const jadwalDinilai = [...new Set(nilai.map((n) => Number(n.jadwalId)))];
  const komposisi = jadwalDinilai.length ? await BobotObe.findAll({ where: { jadwalKuliahId: jadwalDinilai } }) : [];
  const cpmkPerMk = new Map();
  cpmkList.forEach((c) => cpmkPerMk.set(c.mataKuliahId, [...(cpmkPerMk.get(c.mataKuliahId) ?? []), { id: c.id, kode: c.kode }]));
  const bobotKunci = new Map();
  komposisi.forEach((b) => {
    const j = jadwalById.get(b.jadwalKuliahId);
    const { kolom } = kolomDari(b.komponenEvaluasi ?? [], cpmkPerMk.get(j?.mataKuliahId) ?? []);
    bobotKunci.set(b.jadwalKuliahId, new Map(kolom.map((k) => [k.kunci, { cpmkId: k.cpmkId, bobot: k.bobot }])));
  });

  // 1. Nilai CPMK per (mahasiswa, kelas).
  const perKelas = new Map(); // `${mhs}|${jadwal}` → Map(cpmkId → [[nilai, bobot]])
  nilai.forEach((n) => {
    const jadwalId = Number(n.jadwalId);
    const info = bobotKunci.get(jadwalId)?.get(n.kunci);
    const cpmkId = info?.cpmkId ?? Number(String(n.kunci).split('|')[1]);
    if (!cpmkId || !cpmkById.has(cpmkId)) return;
    const key = `${n.mahasiswaId}|${jadwalId}`;
    if (!perKelas.has(key)) perKelas.set(key, new Map());
    const m = perKelas.get(key);
    m.set(cpmkId, [...(m.get(cpmkId) ?? []), [Number(n.nilai), info?.bobot ?? 1]]);
  });

  // 2. Pilih kelas sesuai metode, lalu nilai CPMK per mahasiswa.
  const kelasMhs = new Map(); // mhs → Map(mkId → [jadwalId...])
  for (const key of perKelas.keys()) {
    const [mhs, jadwalId] = key.split('|').map(Number);
    const mkId = jadwalById.get(jadwalId)?.mataKuliahId;
    if (!kelasMhs.has(mhs)) kelasMhs.set(mhs, new Map());
    const m = kelasMhs.get(mhs);
    m.set(mkId, [...(m.get(mkId) ?? []), jadwalId]);
  }
  const nilaiCpmk = new Map(); // mhs → Map(cpmkId → nilai)
  kelasMhs.forEach((perMk, mhs) => {
    const kumpul = new Map();
    perMk.forEach((ids) => {
      const dipakai = metode === 'progresif' ? [ids.sort((a, b) => jadwalById.get(b).urut - jadwalById.get(a).urut)[0]] : ids;
      dipakai.forEach((jid) => {
        perKelas.get(`${mhs}|${jid}`).forEach((pairs, cpmkId) => {
          const n = rataBerbobot(pairs);
          if (n !== null) kumpul.set(cpmkId, [...(kumpul.get(cpmkId) ?? []), n]);
        });
      });
    });
    nilaiCpmk.set(mhs, new Map([...kumpul.entries()].map(([id, list]) => [id, rata(list)])));
  });

  // 3. Nilai CPL induk per mahasiswa.
  const petaCpl = new Map(); // cplIndukId → [[cpmkId, bobot]]
  peta.forEach((p) => {
    const induk = indukCpl.get(Number(p.cplId));
    if (!induk) return;
    petaCpl.set(induk, [...(petaCpl.get(induk) ?? []), [Number(p.cpmkId), Number(p.bobot) || 0]]);
  });
  const nilaiCpl = new Map(); // mhs → Map(cplId → nilai)
  nilaiCpmk.forEach((cpmkMap, mhs) => {
    nilaiCpl.set(
      mhs,
      new Map(cplInduk.map((c) => [c.id, rataBerbobot((petaCpl.get(c.id) ?? []).map(([cpmkId, b]) => [cpmkMap.get(cpmkId) ?? null, b]))]))
    );
  });

  const mhsIds = [...nilaiCpmk.keys()];
  const mahasiswa = mhsIds.length
    ? await q('SELECT id, nim, nama_lengkap AS nama, tahun_masuk AS angkatan FROM mahasiswa WHERE id IN (:ids) ORDER BY nim', { ids: mhsIds })
    : [];

  const mkById = new Map(mkList.map((m) => [m.id, m]));
  const statistik = (list, target) => {
    const ada = list.filter((v) => v !== null && v !== undefined);
    const nilaiRata = rata(ada);
    return {
      jumlahMahasiswa: ada.length,
      rerata: nilaiRata,
      min: ada.length ? round2(Math.min(...ada)) : null,
      max: ada.length ? round2(Math.max(...ada)) : null,
      target,
      tercapai: nilaiRata === null || target === null ? null : nilaiRata >= target,
    };
  };
  // Target CPL = rata-rata target CPL mata kuliah yang memiliki CPMK terpetakan ke CPL tsb (Setting Kurikulum).
  const targetCpl = (cplId) => {
    const mkSet = new Set((petaCpl.get(cplId) ?? []).map(([cpmkId]) => cpmkById.get(cpmkId)?.mataKuliahId));
    return rata([...mkSet].map((id) => mkById.get(id)?.targetCpl).filter((v) => v !== null && v !== undefined).map(Number));
  };

  // Mahasiswa yang mengambil MK kurikulum ini (KRS disetujui) + yang sudah dinilai; yang belum punya nilai OBE
  // tampil "-" di laporan per mahasiswa. Total Mahasiswa di semua jenis laporan = jumlah ini, jumlahDinilai = yang
  // sudah punya nilai OBE (dasar rerata).
  const terdaftar = jadwal.length
    ? await q(
        `SELECT DISTINCT m.id, m.nim, m.nama_lengkap AS nama, m.tahun_masuk AS angkatan
           FROM krs_detail d JOIN krs k ON k.id = d.krs_id AND k.status = 'DISETUJUI' JOIN mahasiswa m ON m.id = k.mahasiswa_id
          WHERE d.jadwal_kuliah_id IN (:jadwalIds) AND m.jurusan_id IN (:jurusanIds) ${angkatan ? 'AND m.tahun_masuk = :angkatan' : ''}`,
        { jadwalIds: jadwal.map((j) => j.id), jurusanIds: jurusanIds.map((j) => j.id), angkatan: Number(angkatan) || null }
      )
    : [];
  const semua = [...new Map([...mahasiswa, ...terdaftar].map((m) => [m.id, m])).values()].sort((a, b) => String(a.nim).localeCompare(String(b.nim)));

  const konteks = {
    jenis,
    metode,
    prodi: [jurusanIds[0].jenjangPendidikan, jurusanIds[0].namaJurusan].filter(Boolean).join(' - '),
    kodeProdi: String(kodeProdi),
    tahunKurikulum: Number(tahunKurikulum),
    angkatan: Number(angkatan) || null,
    jumlahMahasiswa: semua.length,
    jumlahDinilai: mahasiswa.length,
  };

  if (jenis === 'cpl-prodi') {
    return {
      konteks,
      rows: cplInduk.map((c) => {
        const nilaiMhs = mahasiswa.map((m) => nilaiCpl.get(m.id)?.get(c.id) ?? null).filter((v) => v !== null);
        const target = targetCpl(c.id);
        return {
          id: c.id,
          kode: c.kode,
          aspek: c.aspek,
          deskripsi: c.deskripsi,
          jumlahCpmk: (petaCpl.get(c.id) ?? []).length,
          ...statistik(nilaiMhs, target),
          // Ketercapaian mahasiswa: jumlah yang nilai CPL-nya di bawah / ≥ target (null bila target / nilai belum ada).
          mhsBelum: target === null || !nilaiMhs.length ? null : nilaiMhs.filter((v) => v < target).length,
          mhsSudah: target === null || !nilaiMhs.length ? null : nilaiMhs.filter((v) => v >= target).length,
        };
      }),
    };
  }
  if (jenis === 'cpl-mahasiswa' || perMk) {
    if (perMk) {
      const mk = mkList[0];
      // Kolom CPMK sesuai level Pemetaan CPMK mata kuliah (CPMK induk / Sub-CPMK), sama dengan Input Nilai.
      const milikMk = cpmkList.filter((c) => c.mataKuliahId === mk.id);
      const indukCpmk = milikMk.filter((c) => !c.parentId);
      const kolom =
        mk.levelPemetaanCpmk === 'SUB_CPMK'
          ? indukCpmk.flatMap((c) => {
              const sub = milikMk.filter((x) => x.parentId === c.id);
              return sub.length ? sub : [c];
            })
          : indukCpmk;
      const target = mk.targetCpmk ?? null;
      // Status: belum ada nilai → BELUM_DINILAI; target kosong → TANPA_TARGET; semua CPMK ≥ target → SUDAH.
      const statusMhs = (nilai) => {
        const ada = kolom.map((c) => nilai[c.id]).filter((v) => v !== null && v !== undefined);
        if (!ada.length) return 'BELUM_DINILAI';
        if (target === null) return 'TANPA_TARGET';
        return ada.length === kolom.length && ada.every((v) => v >= target) ? 'SUDAH' : 'BELUM';
      };
      const rows = semua.map((m) => {
        const nilai = Object.fromEntries(kolom.map((c) => [c.id, nilaiCpmk.get(m.id)?.get(c.id) ?? null]));
        return { id: m.id, nim: m.nim, nama: m.nama, angkatan: m.angkatan, nilai, status: statusMhs(nilai) };
      });
      return {
        konteks,
        mataKuliah: { id: mk.id, kode: mk.kode, mataKuliah: mk.mataKuliah, sks: mk.sksTotal, semester: mk.semester, isObe: !!mk.isObe, targetCpmk: target },
        kolom: kolom.map((c) => ({ id: c.id, kode: c.kode, deskripsi: c.deskripsi })),
        rows,
        rerata: Object.fromEntries(kolom.map((c) => [c.id, rata(rows.map((r) => r.nilai[c.id]).filter((v) => v !== null))])),
      };
    }
    return {
      konteks,
      kolom: cplInduk.map((c) => ({ id: c.id, kode: c.kode, deskripsi: c.deskripsi, target: targetCpl(c.id) })),
      rows: semua.map((m) => ({
        id: m.id,
        nim: m.nim,
        nama: m.nama,
        angkatan: m.angkatan,
        nilai: Object.fromEntries(cplInduk.map((c) => [c.id, nilaiCpl.get(m.id)?.get(c.id) ?? null])),
      })),
      rerata: Object.fromEntries(cplInduk.map((c) => [c.id, rata(mahasiswa.map((m) => nilaiCpl.get(m.id)?.get(c.id)).filter((v) => v !== null && v !== undefined))])),
    };
  }
  // cpmk-mk
  const cplKodeOf = new Map(cplList.map((c) => [c.id, cplList.find((x) => x.id === (c.parentId ?? c.id))?.kode]));
  return {
    konteks,
    rows: mkList
      .filter((m) => cpmkPerMk.has(m.id))
      .map((m) => ({
        id: m.id,
        kode: m.kode,
        mataKuliah: m.mataKuliah,
        semester: m.semester,
        isObe: !!m.isObe,
        cpmk: cpmkList
          .filter((c) => c.mataKuliahId === m.id)
          .map((c) => ({
            id: c.id,
            kode: c.kode,
            deskripsi: c.deskripsi,
            cpl: [...new Set(peta.filter((p) => Number(p.cpmkId) === c.id).map((p) => cplKodeOf.get(Number(p.cplId))).filter(Boolean))],
            ...statistik(mahasiswa.map((x) => nilaiCpmk.get(x.id)?.get(c.id) ?? null), m.targetCpmk ?? null),
          })),
      })),
  };
};

/** Pilihan mata kuliah (CPMK per Mahasiswa) pada kurikulum prodi + tahun kurikulum; yang punya CPMK didahulukan. */
const opsiMataKuliah = async ({ kodeProdi, tahunKurikulum }, jurusanId) => {
  if (!kodeProdi || !tahunKurikulum) return [];
  const scope = await kodeProdiScope(jurusanId);
  if (scope && !scope.includes(String(kodeProdi))) throw new ApiError(403, 'Program studi ini bukan milik prodi Anda');
  const rows = await q(
    `SELECT m.id, m.kode, m.mata_kuliah AS mataKuliah, m.semester, m.is_obe AS isObe,
            m.sks_teori + m.sks_praktek + m.sks_lab + m.sks_simulasi AS sks,
            (SELECT COUNT(*) FROM cpmk c WHERE c.mata_kuliah_id = m.id) AS jumlahCpmk
       FROM mata_kuliah m JOIN kurikulum k ON k.id = m.kurikulum_id JOIN jurusan j ON j.id = k.jurusan_id
      WHERE m.is_delete = 0 AND k.is_delete = 0 AND j.kode_prodi = :kodeProdi AND k.tahun_kurikulum = :tahun
      ORDER BY (jumlahCpmk > 0) DESC, m.semester, m.kode`,
    { kodeProdi: String(kodeProdi), tahun: Number(tahunKurikulum) }
  );
  return rows.map((r) => ({ ...r, sks: Number(r.sks), isObe: !!Number(r.isObe), jumlahCpmk: Number(r.jumlahCpmk) }));
};

module.exports = { JENIS, METODE, filterOptions, generate, opsiMataKuliah };
