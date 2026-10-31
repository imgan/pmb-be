const { sequelize } = require('../models');
const ApiError = require('../utils/ApiError');

/**
 * Obrolan E-learning untuk mahasiswa & dosen ("pihak" = { tipe: 'M', id } atau { tipe: 'D', id, tahunAjaranId }).
 * - Grup kelas: otomatis untuk kelas yang diikuti (mahasiswa: KRS disetujui, TA aktif) / diampu (dosen: koordinator
 *   atau pengampu, TA pilihan dosen / aktif).
 * - Chat pribadi: mahasiswa–mahasiswa sekelas (kunci 'P:<idKecil>:<idBesar>') dan dosen–mahasiswa kelasnya
 *   (kunci 'D:<dosenId>:<mahasiswaId>').
 * - Pesan teks dan/atau lampiran (gambar / file, maks 5 MB); diambil dengan polling (?setelah=<id pesan terakhir>).
 * - Pengirim dapat menarik pesannya: isi & lampiran dihapus, baris tetap ada (ditarik_at) → tampil "Pesan ini telah ditarik".
 */
const q = (sql, replacements) => sequelize.query(sql, { replacements, type: sequelize.QueryTypes.SELECT });
const exec = (sql, replacements) => sequelize.query(sql, { replacements });
const MAKS_PESAN = 2000;
const MAKS_LAMPIRAN = 5 * 1024 * 1024;
// Lampiran yang diizinkan: ekstensi → MIME & tanda tangan awal file (PDF "%PDF"; ZIP / DOCX / PPTX = arsip ZIP "PK\x03\x04").
const ZIP = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
const JENIS_LAMPIRAN = {
  pdf: { mime: 'application/pdf', tanda: Buffer.from('%PDF') },
  zip: { mime: 'application/zip', tanda: ZIP },
  docx: { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', tanda: ZIP },
  pptx: { mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', tanda: ZIP },
};

const kolom = (p) => (p.tipe === 'D' ? 'dosen_id' : 'mahasiswa_id');
const NAMA_DOSEN = "CONCAT_WS(', ', NULLIF(d.nama_lengkap, ''), NULLIF(d.gelar, ''))";

/** Kelas milik pihak: mahasiswa = KRS disetujui (TA aktif); dosen = koordinator / pengampu (TA pilihan, default aktif). */
const kelasPihak = (p) =>
  p.tipe === 'D'
    ? q(
        `SELECT j.id, j.kelas, j.kode_mata_kuliah AS kodeMataKuliah, j.nama_mata_kuliah AS namaMataKuliah,
                (SELECT mk.ikon FROM mata_kuliah mk WHERE mk.id = j.mata_kuliah_id) AS ikon
           FROM jadwal_kuliah j JOIN tahun_ajaran t ON t.id = j.tahun_ajaran_id
          WHERE (j.dosen_kordinator_id = :id OR EXISTS (SELECT 1 FROM jadwal_kuliah_dosen_pengampu x WHERE x.jadwal_kuliah_id = j.id AND x.dosen_id = :id))
            AND ${p.tahunAjaranId ? 'j.tahun_ajaran_id = :ta' : 't.is_active = 1'}
          ORDER BY j.nama_mata_kuliah, j.kelas`,
        { id: p.id, ta: p.tahunAjaranId ?? 0 }
      )
    : q(
        `SELECT DISTINCT j.id, j.kelas, j.kode_mata_kuliah AS kodeMataKuliah, j.nama_mata_kuliah AS namaMataKuliah,
                (SELECT mk.ikon FROM mata_kuliah mk WHERE mk.id = j.mata_kuliah_id) AS ikon
           FROM krs k
           JOIN krs_detail d ON d.krs_id = k.id
           JOIN jadwal_kuliah j ON j.id = d.jadwal_kuliah_id
           JOIN tahun_ajaran t ON t.id = j.tahun_ajaran_id AND t.is_active = 1
          WHERE k.mahasiswa_id = :id AND k.status = 'DISETUJUI'
          ORDER BY j.nama_mata_kuliah, j.kelas`,
        { id: p.id }
      );

/** Mahasiswa peserta (KRS disetujui) kelas-kelas tsb, kecuali dirinya. */
const pesertaDari = (jadwalIds, kecualiMahasiswaId = 0) =>
  q(
    `SELECT m.id, m.nim AS nomor, m.nama_lengkap AS nama, GROUP_CONCAT(DISTINCT j.nama_mata_kuliah ORDER BY j.nama_mata_kuliah SEPARATOR ', ') AS keterangan
       FROM krs k
       JOIN krs_detail kd ON kd.krs_id = k.id
       JOIN jadwal_kuliah j ON j.id = kd.jadwal_kuliah_id
       JOIN mahasiswa m ON m.id = k.mahasiswa_id
      WHERE k.status = 'DISETUJUI' AND kd.jadwal_kuliah_id IN (:ids) AND m.id <> :kecuali
      GROUP BY m.id, m.nim, m.nama_lengkap
      ORDER BY m.nama_lengkap`,
    { ids: jadwalIds, kecuali: kecualiMahasiswaId }
  );

/** Dosen koordinator / pengampu kelas-kelas tsb. */
const dosenDari = (jadwalIds) =>
  q(
    `SELECT d.id, d.nidn AS nomor, ${NAMA_DOSEN} AS nama, GROUP_CONCAT(DISTINCT j.nama_mata_kuliah ORDER BY j.nama_mata_kuliah SEPARATOR ', ') AS keterangan
       FROM jadwal_kuliah j
       JOIN dosen d ON d.id = j.dosen_kordinator_id OR d.id IN (SELECT x.dosen_id FROM jadwal_kuliah_dosen_pengampu x WHERE x.jadwal_kuliah_id = j.id)
      WHERE j.id IN (:ids)
      GROUP BY d.id, d.nidn, d.nama_lengkap, d.gelar
      ORDER BY d.nama_lengkap`,
    { ids: jadwalIds }
  );

/** Kontak chat pribadi: mahasiswa = dosen kelasnya + teman sekelas; dosen = mahasiswa kelas yang diampu. */
const kontak = async (p) => {
  const ids = (await kelasPihak(p)).map((k) => k.id);
  if (!ids.length) return [];
  const bentuk = (tipe) => (r) => ({ tipe, id: Number(r.id), nomor: r.nomor, nama: r.nama, keterangan: r.keterangan });
  if (p.tipe === 'D') return (await pesertaDari(ids)).map(bentuk('M'));
  const [dosen, teman] = await Promise.all([dosenDari(ids), pesertaDari(ids, p.id)]);
  return [...dosen.map(bentuk('D')), ...teman.map(bentuk('M'))];
};

/** Pastikan baris obrolan grup tiap kelas ada; kembalikan Map(jadwalId → obrolanId). */
const pastikanGrupKelas = async (jadwalIds) => {
  if (!jadwalIds.length) return new Map();
  await exec(
    `INSERT IGNORE INTO obrolan (jenis, kunci, jadwal_kuliah_id, created_at, updated_at) VALUES ${jadwalIds.map(() => "('KELAS', ?, ?, NOW(), NOW())").join(', ')}`,
    jadwalIds.flatMap((id) => [`K:${id}`, id])
  );
  const rows = await q("SELECT id, jadwal_kuliah_id AS jadwalId FROM obrolan WHERE jenis = 'KELAS' AND jadwal_kuliah_id IN (:ids)", { ids: jadwalIds });
  return new Map(rows.map((r) => [Number(r.jadwalId), Number(r.id)]));
};

/** Chat pribadi yang diikuti pihak + lawan bicaranya. */
const pribadiPihak = (p) =>
  q(
    `SELECT o.id, b.mahasiswa_id AS lawanMhs, b.dosen_id AS lawanDosen,
            COALESCE(m.nama_lengkap, ${NAMA_DOSEN}) AS lawanNama, COALESCE(m.nim, d.nidn) AS lawanNomor
       FROM obrolan o
       JOIN obrolan_anggota a ON a.obrolan_id = o.id AND a.${kolom(p)} = :id
       JOIN obrolan_anggota b ON b.obrolan_id = o.id AND b.id <> a.id
       LEFT JOIN mahasiswa m ON m.id = b.mahasiswa_id
       LEFT JOIN dosen d ON d.id = b.dosen_id
      WHERE o.jenis = 'PRIBADI'`,
    { id: p.id }
  );

/** Jumlah pesan belum dibaca per obrolan (pesan dari pihak lain setelah penanda baca). */
const hitungBelum = (p, ids) =>
  ids.length
    ? q(
        `SELECT p.obrolan_id AS id, COUNT(*) AS n
           FROM obrolan_pesan p
           LEFT JOIN obrolan_anggota a ON a.obrolan_id = p.obrolan_id AND a.${kolom(p)} = :id
          WHERE p.obrolan_id IN (:ids) AND COALESCE(p.${kolom(p)}, 0) <> :id AND p.id > COALESCE(a.terakhir_dibaca_id, 0) AND p.ditarik_at IS NULL
          GROUP BY p.obrolan_id`,
        { ids, id: p.id }
      )
    : Promise.resolve([]);

/** Daftar obrolan: grup kelas + chat pribadi, dengan pesan terakhir & jumlah belum dibaca. */
const listObrolan = async (p) => {
  const kelas = await kelasPihak(p);
  const grupOf = await pastikanGrupKelas(kelas.map((k) => Number(k.id)));
  const pribadi = await pribadiPihak(p);
  const ids = [...grupOf.values(), ...pribadi.map((x) => Number(x.id))];
  if (!ids.length) return { obrolan: [], belumDibaca: 0 };
  const [terakhir, belum, anggota] = await Promise.all([
    q(
      `SELECT p.obrolan_id AS id, p.isi, p.lampiran_nama AS lampiranNama, p.ditarik_at AS ditarik, p.created_at AS waktu, p.mahasiswa_id AS mhs, p.dosen_id AS dsn,
              COALESCE(m.nama_lengkap, ${NAMA_DOSEN}) AS pengirim
         FROM obrolan_pesan p LEFT JOIN mahasiswa m ON m.id = p.mahasiswa_id LEFT JOIN dosen d ON d.id = p.dosen_id
        WHERE p.id IN (SELECT MAX(id) FROM obrolan_pesan WHERE obrolan_id IN (:ids) GROUP BY obrolan_id)`,
      { ids }
    ),
    hitungBelum(p, ids),
    q(
      `SELECT kd.jadwal_kuliah_id AS jadwalId, COUNT(DISTINCT k.mahasiswa_id) AS n FROM krs_detail kd JOIN krs k ON k.id = kd.krs_id AND k.status = 'DISETUJUI'
        WHERE kd.jadwal_kuliah_id IN (:jids) GROUP BY kd.jadwal_kuliah_id`,
      { jids: kelas.length ? kelas.map((k) => k.id) : [0] }
    ),
  ]);
  const terakhirOf = new Map(terakhir.map((r) => [Number(r.id), r]));
  const belumOf = new Map(belum.map((r) => [Number(r.id), Number(r.n)]));
  const anggotaOf = new Map(anggota.map((r) => [Number(r.jadwalId), Number(r.n)]));
  const sayaKah = (r) => Number(p.tipe === 'D' ? r.dsn : r.mhs) === p.id;
  const bentukTerakhir = (id) => {
    const t = terakhirOf.get(id);
    if (!t) return null;
    const isi = t.ditarik ? '🚫 Pesan ditarik' : t.isi || (t.lampiranNama ? `📎 ${t.lampiranNama}` : '');
    return { isi, waktu: t.waktu, pengirim: sayaKah(t) ? 'Anda' : t.pengirim, dariDosen: !!t.dsn };
  };
  const obrolan = [
    ...kelas.map((k) => {
      const id = grupOf.get(Number(k.id));
      return {
        id,
        jenis: 'KELAS',
        nama: k.namaMataKuliah,
        keterangan: `${k.kodeMataKuliah} · Kelas ${k.kelas} · ${anggotaOf.get(Number(k.id)) ?? 0} mahasiswa`,
        kodeMataKuliah: k.kodeMataKuliah,
        ikon: k.ikon ?? null,
        terakhir: bentukTerakhir(id),
        belumDibaca: belumOf.get(id) ?? 0,
      };
    }),
    ...pribadi.map((x) => {
      const id = Number(x.id);
      return {
        id,
        jenis: 'PRIBADI',
        nama: x.lawanNama,
        keterangan: x.lawanNomor,
        lawan: { tipe: x.lawanDosen ? 'D' : 'M', id: Number(x.lawanDosen ?? x.lawanMhs) },
        terakhir: bentukTerakhir(id),
        belumDibaca: belumOf.get(id) ?? 0,
      };
    }),
  ];
  // Pesan terbaru di atas; obrolan tanpa pesan di bawah.
  obrolan.sort((a, b) => new Date(b.terakhir?.waktu ?? 0) - new Date(a.terakhir?.waktu ?? 0));
  return { obrolan, belumDibaca: obrolan.reduce((s, o) => s + o.belumDibaca, 0) };
};

/** Total pesan belum dibaca (badge menu) — tanpa membuat grup baru. */
const totalBelumDibaca = async (p) => {
  const kelas = await kelasPihak(p);
  const grup = kelas.length
    ? await q("SELECT id FROM obrolan WHERE jenis = 'KELAS' AND jadwal_kuliah_id IN (:ids)", { ids: kelas.map((k) => k.id) })
    : [];
  const ids = [...grup.map((g) => Number(g.id)), ...(await pribadiPihak(p)).map((x) => Number(x.id))];
  return { belumDibaca: (await hitungBelum(p, ids)).reduce((s, r) => s + Number(r.n), 0) };
};

/** Cek akses: grup kelas = peserta / pengajar kelas tsb; pribadi = anggota. */
const aksesObrolan = async (p, obrolanId) => {
  const [o] = await q('SELECT id, jenis, jadwal_kuliah_id AS jadwalId FROM obrolan WHERE id = :id', { id: Number(obrolanId) });
  if (!o) throw new ApiError(404, 'Obrolan tidak ditemukan');
  let ok;
  if (o.jenis === 'PRIBADI') [ok] = await q(`SELECT 1 AS ok FROM obrolan_anggota WHERE obrolan_id = :o AND ${kolom(p)} = :id`, { o: o.id, id: p.id });
  else if (p.tipe === 'D')
    [ok] = await q(
      `SELECT 1 AS ok FROM jadwal_kuliah j WHERE j.id = :j
          AND (j.dosen_kordinator_id = :id OR EXISTS (SELECT 1 FROM jadwal_kuliah_dosen_pengampu x WHERE x.jadwal_kuliah_id = j.id AND x.dosen_id = :id))`,
      { j: o.jadwalId, id: p.id }
    );
  else
    [ok] = await q(`SELECT 1 AS ok FROM krs k JOIN krs_detail d ON d.krs_id = k.id WHERE k.mahasiswa_id = :id AND k.status = 'DISETUJUI' AND d.jadwal_kuliah_id = :j LIMIT 1`, {
      id: p.id,
      j: o.jadwalId,
    });
  if (!ok) throw new ApiError(403, 'Anda bukan anggota obrolan ini');
  return o;
};

const tandaiDibaca = (obrolanId, p, pesanId) =>
  exec(
    `INSERT INTO obrolan_anggota (obrolan_id, ${kolom(p)}, terakhir_dibaca_id, created_at, updated_at) VALUES (:o, :id, :p, NOW(), NOW())
     ON DUPLICATE KEY UPDATE terakhir_dibaca_id = GREATEST(COALESCE(terakhir_dibaca_id, 0), VALUES(terakhir_dibaca_id)), updated_at = NOW()`,
    { o: obrolanId, id: p.id, p: pesanId }
  );

/**
 * Pesan obrolan: 100 terakhir, yang lebih baru dari ?setelah, atau lebih lama dari ?sebelum; menandai sudah dibaca.
 * Saat polling (?setelah) dengan ?dari = id pesan tertua di layar, `ditarik` berisi id pesan yang sudah ditarik dalam
 * rentang tsb agar tampilan anggota lain ikut berubah.
 */
const listPesan = async (p, obrolanId, setelah = 0, sebelum = 0, dari = 0) => {
  const o = await aksesObrolan(p, obrolanId);
  const rows = await q(
    `SELECT p.id, p.isi, p.created_at AS waktu, p.mahasiswa_id AS mhs, p.dosen_id AS dsn,
            p.lampiran_nama AS lampiranNama, p.lampiran_tipe AS lampiranTipe, p.lampiran_ukuran AS lampiranUkuran, p.ditarik_at AS ditarikAt,
            COALESCE(m.nim, d.nidn) AS nomor, COALESCE(m.nama_lengkap, ${NAMA_DOSEN}) AS nama
       FROM obrolan_pesan p LEFT JOIN mahasiswa m ON m.id = p.mahasiswa_id LEFT JOIN dosen d ON d.id = p.dosen_id
      WHERE p.obrolan_id = :o ${setelah ? 'AND p.id > :setelah' : ''} ${sebelum ? 'AND p.id < :sebelum' : ''}
      ORDER BY p.id DESC LIMIT 100`,
    { o: o.id, setelah: Number(setelah), sebelum: Number(sebelum) }
  );
  const pesan = rows.reverse().map((r) => ({
    id: Number(r.id),
    isi: r.isi ?? '',
    waktu: r.waktu,
    saya: Number(p.tipe === 'D' ? r.dsn : r.mhs) === p.id,
    pengirim: { tipe: r.dsn ? 'D' : 'M', nomor: r.nomor, nama: r.nama },
    lampiran: r.lampiranNama ? { nama: r.lampiranNama, tipe: r.lampiranTipe, ukuran: Number(r.lampiranUkuran) || 0 } : null,
    ditarik: !!r.ditarikAt,
  }));
  if (pesan.length && !sebelum) await tandaiDibaca(o.id, p, pesan[pesan.length - 1].id);
  const ditarik =
    setelah && dari
      ? (
          await q('SELECT id FROM obrolan_pesan WHERE obrolan_id = :o AND ditarik_at IS NOT NULL AND id BETWEEN :dari AND :setelah', {
            o: o.id,
            dari: Number(dari),
            setelah: Number(setelah),
          })
        ).map((r) => Number(r.id))
      : [];
  return { pesan, adaLebihLama: rows.length === 100 && !setelah, ditarik };
};

/** Tarik pesan milik sendiri: hapus isi & lampiran, tandai ditarik. */
const tarikPesan = async (p, obrolanId, pesanId) => {
  const o = await aksesObrolan(p, obrolanId);
  const [r] = await q(`SELECT id, ${kolom(p)} AS pemilik, ditarik_at AS ditarik FROM obrolan_pesan WHERE id = :id AND obrolan_id = :o`, {
    id: Number(pesanId),
    o: o.id,
  });
  if (!r) throw new ApiError(404, 'Pesan tidak ditemukan');
  if (Number(r.pemilik) !== p.id) throw new ApiError(403, 'Hanya pengirim yang dapat menarik pesan ini');
  if (!r.ditarik) {
    await exec(
      'UPDATE obrolan_pesan SET isi = NULL, lampiran = NULL, lampiran_nama = NULL, lampiran_tipe = NULL, lampiran_ukuran = NULL, ditarik_at = NOW(), updated_at = NOW() WHERE id = :id',
      { id: r.id }
    );
  }
  return { id: Number(r.id) };
};

/** Isi lampiran satu pesan (data URL). */
const lampiranPesan = async (p, obrolanId, pesanId) => {
  const o = await aksesObrolan(p, obrolanId);
  const [r] = await q('SELECT lampiran, lampiran_nama AS nama, lampiran_tipe AS tipe FROM obrolan_pesan WHERE id = :id AND obrolan_id = :o', { id: Number(pesanId), o: o.id });
  if (!r?.lampiran) throw new ApiError(404, 'Lampiran tidak ditemukan');
  return r;
};

const kirimPesan = async (p, obrolanId, { isi, lampiran, lampiranNama } = {}) => {
  const o = await aksesObrolan(p, obrolanId);
  const teks = String(isi ?? '').trim();
  if (!teks && !lampiran) throw new ApiError(400, 'Pesan tidak boleh kosong');
  if (teks.length > MAKS_PESAN) throw new ApiError(400, `Pesan maksimal ${MAKS_PESAN} karakter`);
  let tipe = null;
  let ukuran = null;
  if (lampiran) {
    const cocok = /^data:([^;,]+)?;base64,/.exec(String(lampiran));
    if (!cocok) throw new ApiError(400, 'Format lampiran tidak valid');
    ukuran = Math.floor(((String(lampiran).length - cocok[0].length) * 3) / 4);
    if (ukuran > MAKS_LAMPIRAN) throw new ApiError(400, 'Ukuran lampiran maksimal 5 MB');
    // Hanya PDF / ZIP / DOCX / PPTX: cek ekstensi nama file + tanda tangan isi file (bukan sekadar ganti nama).
    const ekstensi = String(lampiranNama ?? '').split('.').pop().toLowerCase();
    const jenis = JENIS_LAMPIRAN[ekstensi];
    if (!jenis) throw new ApiError(400, 'File yang boleh diunggah hanya PDF, ZIP, DOCX, atau PPTX');
    const awal = Buffer.from(String(lampiran).slice(cocok[0].length, cocok[0].length + 16), 'base64');
    if (!awal.subarray(0, jenis.tanda.length).equals(jenis.tanda)) throw new ApiError(400, `Isi file tidak sesuai format .${ekstensi}`);
    tipe = jenis.mime;
  }
  const [id] = await exec(
    `INSERT INTO obrolan_pesan (obrolan_id, ${kolom(p)}, isi, lampiran, lampiran_nama, lampiran_tipe, lampiran_ukuran, created_at, updated_at)
     VALUES (:o, :id, :isi, :lampiran, :nama, :tipe, :ukuran, NOW(), NOW())`,
    { o: o.id, id: p.id, isi: teks || null, lampiran: lampiran || null, nama: lampiran ? String(lampiranNama || 'lampiran').slice(0, 255) : null, tipe, ukuran }
  );
  await exec('UPDATE obrolan SET updated_at = NOW() WHERE id = :o', { o: o.id });
  await tandaiDibaca(o.id, p, id);
  return { id };
};

/** Mulai / buka chat pribadi dengan kontak (lawan = { tipe: 'M' | 'D', id }); kembalikan id obrolan. */
const mulaiPribadi = async (p, lawan) => {
  const l = { tipe: lawan.tipe === 'D' ? 'D' : 'M', id: Number(lawan.id) };
  if (l.tipe === p.tipe && l.id === p.id) throw new ApiError(400, 'Tidak bisa mengobrol dengan diri sendiri');
  if (!(await kontak(p)).some((k) => k.tipe === l.tipe && k.id === l.id)) {
    throw new ApiError(403, p.tipe === 'D' ? 'Chat pribadi hanya dengan mahasiswa kelas Anda' : 'Chat pribadi hanya dengan teman sekelas atau dosen kelas Anda');
  }
  const pasangan = [p, l];
  const dosen = pasangan.find((x) => x.tipe === 'D');
  const mhs = pasangan.filter((x) => x.tipe === 'M').map((x) => x.id);
  const kunci = dosen ? `D:${dosen.id}:${mhs[0]}` : `P:${Math.min(...mhs)}:${Math.max(...mhs)}`;
  await exec("INSERT IGNORE INTO obrolan (jenis, kunci, created_at, updated_at) VALUES ('PRIBADI', :kunci, NOW(), NOW())", { kunci });
  const [o] = await q('SELECT id FROM obrolan WHERE kunci = :kunci', { kunci });
  for (const x of pasangan) {
    await exec(`INSERT IGNORE INTO obrolan_anggota (obrolan_id, ${kolom(x)}, created_at, updated_at) VALUES (:o, :id, NOW(), NOW())`, { o: o.id, id: x.id });
  }
  return { id: Number(o.id) };
};

module.exports = { listObrolan, totalBelumDibaca, kontak, listPesan, lampiranPesan, kirimPesan, tarikPesan, mulaiPribadi };
