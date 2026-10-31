const { Op } = require('sequelize');
const { sequelize, MataKuliah, Kurikulum, Jurusan, TahunAjaran, MatakuliahAktif, SettingProdi } = require('../models');
const ApiError = require('../utils/ApiError');
const { formatTahunAjaran } = require('../utils/tahunAjaran');

/**
 * Portal Dosen → Perkuliahan → Mata Kuliah: mata kuliah yang diajar dosen login (koordinator / pengampu
 * jadwal kuliah) pada tahun akademik terpilih, beserta status aktif & akses RPS-nya.
 *
 * Akses RPS (endpoint RPS yang sama dengan Prodi, lihat routes/dosenRps.route.js):
 * - Lihat  : dosen mengajar mata kuliah tsb (periode mana pun).
 * - Ubah   : dosen KOORDINATOR mata kuliah tsb di tahun akademik terpilih DAN Setting Prodi periode itu
 *            mengizinkan "Dosen Bisa Isi Persentase Komponen?" (setting_prodi.dosen_isi_persentase_komponen).
 */

/** Tahun akademik terpilih dosen (header X-Tahun-Ajaran-Id), atau tahun ajaran aktif. */
const tahunAjaranEfektif = async (tahunAjaranId) => {
  const ta = tahunAjaranId ? await TahunAjaran.findByPk(tahunAjaranId) : await TahunAjaran.findOne({ where: { isActive: true }, order: [['id', 'DESC']] });
  return ta ?? null;
};

/** Jadwal kuliah yang diajar dosen (+ peran), opsional dibatasi tahun ajaran / mata kuliah. */
const jadwalDosen = async (dosenId, { tahunAjaranId = null, mataKuliahId = null } = {}) => {
  const rows = await sequelize.query(
    `SELECT j.id, j.kelas, j.mata_kuliah_id AS mataKuliahId, j.tahun_ajaran_id AS tahunAjaranId,
            (j.dosen_kordinator_id = :dosenId) AS koordinator
       FROM jadwal_kuliah j
       LEFT JOIN jadwal_kuliah_dosen_pengampu p ON p.jadwal_kuliah_id = j.id AND p.dosen_id = :dosenId
      WHERE (j.dosen_kordinator_id = :dosenId OR p.dosen_id IS NOT NULL)
        AND j.mata_kuliah_id IS NOT NULL
        ${tahunAjaranId ? 'AND j.tahun_ajaran_id = :tahunAjaranId' : ''}
        ${mataKuliahId ? 'AND j.mata_kuliah_id = :mataKuliahId' : ''}
      GROUP BY j.id`,
    { replacements: { dosenId, tahunAjaranId, mataKuliahId }, type: sequelize.QueryTypes.SELECT }
  );
  return rows.map((r) => ({ ...r, mataKuliahId: Number(r.mataKuliahId), koordinator: !!Number(r.koordinator) }));
};

/** Setting Prodi "Dosen Bisa Isi Persentase Komponen?" per kode prodi pada satu tahun ajaran. */
const izinPerKodeProdi = async (tahunAjaranId) => {
  if (!tahunAjaranId) return new Map();
  const rows = await SettingProdi.findAll({
    where: { tahunAjaranId },
    attributes: ['dosenIsiPersentaseKomponen'],
    include: [{ model: Jurusan, as: 'jurusan', attributes: ['kodeProdi'] }],
  });
  const izin = new Map();
  // Prodi bisa punya beberapa baris jurusan (varian golongan kelas) → cukup salah satu mengizinkan.
  rows.forEach((r) => {
    const kode = r.jurusan?.kodeProdi;
    if (kode) izin.set(kode, (izin.get(kode) ?? false) || !!r.dosenIsiPersentaseKomponen);
  });
  return izin;
};

const alasanTidakBisa = ({ mengajar, koordinator, izinSetting }) => {
  if (!mengajar) return 'Anda tidak mengajar mata kuliah ini';
  if (!koordinator) return 'Hanya dosen koordinator mata kuliah yang dapat mengubah RPS';
  if (!izinSetting) return 'Setting Prodi periode ini belum mengizinkan dosen mengisi persentase komponen';
  return null;
};

/** Hak akses RPS dosen pada satu mata kuliah (lihat keterangan di atas). */
const aksesRps = async (dosenId, mataKuliahId, tahunAjaranId) => {
  const ta = await tahunAjaranEfektif(tahunAjaranId);
  const [semua, mk] = await Promise.all([
    jadwalDosen(dosenId, { mataKuliahId }),
    MataKuliah.findByPk(mataKuliahId, {
      attributes: ['id', 'kurikulumId'],
      include: [{ model: Kurikulum, as: 'kurikulum', attributes: ['id', 'jurusanId'], include: [{ model: Jurusan, as: 'jurusan', attributes: ['kodeProdi'] }] }],
    }),
  ]);
  if (!mk) throw new ApiError(404, 'Mata kuliah tidak ditemukan');
  const mengajar = semua.length > 0;
  const koordinator = !!ta && semua.some((j) => j.koordinator && Number(j.tahunAjaranId) === ta.id);
  const izinSetting = !!(await izinPerKodeProdi(ta?.id)).get(mk.kurikulum?.jurusan?.kodeProdi);
  const status = { mengajar, koordinator, izinSetting };
  const alasan = alasanTidakBisa(status);
  return { ...status, bisaUbah: !alasan, alasan, tahunAjaran: ta ? { id: ta.id, nama: formatTahunAjaran(ta) } : null };
};

/** Daftar mata kuliah yang diajar dosen pada tahun akademik terpilih. */
const listMataKuliah = async (dosenId, tahunAjaranId) => {
  const ta = await tahunAjaranEfektif(tahunAjaranId);
  if (!ta) return { tahunAjaran: null, rows: [] };
  const jadwal = await jadwalDosen(dosenId, { tahunAjaranId: ta.id });
  const mkIds = [...new Set(jadwal.map((j) => j.mataKuliahId))];
  if (!mkIds.length) return { tahunAjaran: { id: ta.id, nama: formatTahunAjaran(ta) }, rows: [] };

  const [mkList, aktifRows, izin] = await Promise.all([
    MataKuliah.findAll({
      where: { id: mkIds },
      include: [
        {
          model: Kurikulum,
          as: 'kurikulum',
          required: false,
          attributes: ['id', 'nama', 'tahunKurikulum', 'jurusanId'],
          include: [{ model: Jurusan, as: 'jurusan', attributes: ['namaJurusan', 'kodeProdi', 'jenjangPendidikan'], required: false }],
        },
      ],
      order: [['semester', 'ASC'], ['kode', 'ASC']],
    }),
    MatakuliahAktif.findAll({ where: { tahunAjaranId: ta.id, mataKuliahId: mkIds }, attributes: ['mataKuliahId', 'semester'], raw: true }),
    izinPerKodeProdi(ta.id),
  ]);
  // Status pengisian: RPS (detail/rencana di periode mana pun), pemetaan CPL, CPMK.
  const isi = await sequelize.query(
    `SELECT m.id,
            (EXISTS (SELECT 1 FROM rps r WHERE r.mata_kuliah_id = m.id) OR EXISTS (SELECT 1 FROM rps_pertemuan p WHERE p.mata_kuliah_id = m.id)) AS rps,
            EXISTS (SELECT 1 FROM cpl_mata_kuliah c WHERE c.mata_kuliah_id = m.id) AS cpl,
            EXISTS (SELECT 1 FROM cpmk k WHERE k.mata_kuliah_id = m.id) AS cpmk
       FROM mata_kuliah m WHERE m.id IN (:ids)`,
    { replacements: { ids: mkIds }, type: sequelize.QueryTypes.SELECT }
  );
  const isiOf = new Map(isi.map((r) => [Number(r.id), { rps: !!Number(r.rps), cpl: !!Number(r.cpl), cpmk: !!Number(r.cpmk) }]));

  const rows = mkList.map((m) => {
    const kelas = jadwal.filter((j) => j.mataKuliahId === m.id).sort((a, b) => String(a.kelas).localeCompare(String(b.kelas)));
    const aktifSemesters = aktifRows.filter((r) => r.mataKuliahId === m.id).map((r) => r.semester).sort((a, b) => a - b);
    const status = { mengajar: true, koordinator: kelas.some((k) => k.koordinator), izinSetting: !!izin.get(m.kurikulum?.jurusan?.kodeProdi) };
    const alasan = alasanTidakBisa(status);
    return {
      id: m.id,
      kode: m.kode,
      mataKuliah: m.mataKuliah,
      prodi: [m.kurikulum?.jurusan?.jenjangPendidikan, m.kurikulum?.jurusan?.namaJurusan].filter(Boolean).join(' ') || null,
      tahunKurikulum: m.kurikulum?.tahunKurikulum ?? null,
      semester: m.semester,
      sksTeori: m.sksTeori,
      sksPraktek: m.sksPraktek,
      sksLab: m.sksLab,
      sksTotal: m.sksTotal,
      isObe: !!m.isObe,
      jenisMataKuliah: m.jenisMataKuliah ?? null,
      pengisian: isiOf.get(m.id) ?? { rps: false, cpl: false, cpmk: false },
      aktif: aktifSemesters.length > 0,
      aktifSemesters,
      kelas: kelas.map((k) => ({ id: k.id, kelas: k.kelas, peran: k.koordinator ? 'Koordinator' : 'Pengampu' })),
      koordinator: status.koordinator,
      bisaUbahRps: !alasan,
      alasan,
    };
  });
  // Yang aktif di tahun akademik ini didahulukan.
  rows.sort((a, b) => Number(b.aktif) - Number(a.aktif));
  return { tahunAjaran: { id: ta.id, nama: formatTahunAjaran(ta) }, rows };
};

/** Pilihan "Cari Mata Kuliah" di halaman RPS: semua mata kuliah yang pernah/sedang diajar dosen. */
const opsiMataKuliah = async (dosenId) => {
  const ids = [...new Set((await jadwalDosen(dosenId)).map((j) => j.mataKuliahId))];
  if (!ids.length) return [];
  const rows = await MataKuliah.findAll({
    where: { id: { [Op.in]: ids } },
    attributes: ['id', 'kode', 'mataKuliah', 'semester'],
    include: [{ model: Kurikulum, as: 'kurikulum', attributes: ['tahunKurikulum'], required: false }],
    order: [['kode', 'ASC']],
  });
  return rows.map((m) => ({ id: m.id, kode: m.kode, mataKuliah: m.mataKuliah, semester: m.semester, tahunKurikulum: m.kurikulum?.tahunKurikulum ?? null }));
};

/** Daftar tahun ajaran (pilihan "Berlaku Sejak Periode" di RPS). */
const listTahunAjaran = () => TahunAjaran.findAll({ order: [['tahunMulai', 'DESC'], ['jenisSemester', 'DESC']] });

module.exports = { aksesRps, listMataKuliah, opsiMataKuliah, listTahunAjaran };
