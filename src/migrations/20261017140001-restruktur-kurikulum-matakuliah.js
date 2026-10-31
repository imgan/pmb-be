'use strict';

/**
 * Restrukturisasi Kurikulum ↔ Mata Kuliah jadi one-to-many.
 *
 * Sebelumnya tabel `kurikulum` berisi BARIS MATA KULIAH (kode, nama, SKS, semester + prodi & tahun
 * kurikulum di tiap baris) tanpa entitas kurikulum, sementara `mata_kuliah` adalah master terpisah
 * yang hanya "nyambung" lewat teks kode. Sekarang:
 *   kurikulum (header: prodi, tahun kurikulum, nama, tanggal efektif)  1 ──< N  mata_kuliah
 *
 * Langkah:
 *  1. Header dibuat per kombinasi (jurusan_id, tahun_kurikulum) dari baris lama.
 *  2. Baris lama dipindah jadi mata_kuliah DENGAN ID YANG SAMA (jadwal_kuliah.kurikulum_id,
 *     matakuliah_aktif.kurikulum_id & konversi tetap valid), silabus diambil dari master lama (kode).
 *  3. jadwal_kuliah cukup menunjuk satu mata kuliah (mata_kuliah_id): dari kurikulum_id; bila hanya
 *     punya master lama / kosong → dicocokkan lewat kode MK di prodi kelasnya (awalan kelas), tahun
 *     kurikulum terbaru; yang tidak ada di kurikulum mana pun dibuat sebagai MK di kurikulum terbaru
 *     prodi tsb (SKS & semester dari jadwal).
 *  4. matakuliah_aktif.kurikulum_id → mata_kuliah_id; konversi dari/ke_kurikulum_id → dari/ke_mata_kuliah_id.
 *  5. Tabel lama disimpan: bak_kurikulum_20261017, bak_mata_kuliah_20261017, dan
 *     bak_jadwal_kuliah_mk_20261017 (kurikulum_id & mata_kuliah_id lama per jadwal).
 */
const KODE_PRODI_BY_PREFIX_KELAS = { F: '48401', L: '63414', A: '13461', T: '90346' };
const BAK = { kurikulum: 'bak_kurikulum_20261017', mataKuliah: 'bak_mata_kuliah_20261017', jadwal: 'bak_jadwal_kuliah_mk_20261017' };

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const db = queryInterface.sequelize;
    const q = (sql, replacements) => db.query(sql, { replacements, type: db.QueryTypes.SELECT });
    const run = (sql, replacements) => db.query(sql, { replacements });
    const tables = await queryInterface.showAllTables();
    if (tables.includes(BAK.kurikulum)) throw new Error('Restrukturisasi kurikulum sudah pernah dijalankan');

    // ---------- 0. Cadangan relasi jadwal ----------
    await run(`CREATE TABLE ${BAK.jadwal} AS SELECT id, kurikulum_id, mata_kuliah_id FROM jadwal_kuliah`);

    // ---------- 1. Tabel header baru ----------
    await queryInterface.createTable('kurikulum_baru', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      jurusan_id: { type: Sequelize.INTEGER, allowNull: true },
      tahun_kurikulum: { type: Sequelize.INTEGER, allowNull: true },
      nama: { type: Sequelize.STRING(150), allowNull: false },
      tanggal_mulai_efektif: { type: Sequelize.DATEONLY, allowNull: true },
      tanggal_akhir_efektif: { type: Sequelize.DATEONLY, allowNull: true },
      keterangan: { type: Sequelize.TEXT, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      is_delete: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      created_by: { type: Sequelize.INTEGER, allowNull: true },
      updated_by: { type: Sequelize.INTEGER, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await run(
      `INSERT INTO kurikulum_baru (jurusan_id, tahun_kurikulum, nama, tanggal_mulai_efektif, tanggal_akhir_efektif, is_active, is_delete, created_at, updated_at)
       SELECT k.jurusan_id, k.tahun_kurikulum,
              TRIM(CONCAT('Kurikulum ', IFNULL(k.tahun_kurikulum, ''), ' ', IFNULL(j.nama_jurusan, 'Tanpa Prodi'))),
              MIN(k.tanggal_mulai_efektif), MAX(k.tanggal_akhir_efektif), 1, 0, NOW(), NOW()
         FROM kurikulum k LEFT JOIN jurusan j ON j.id = k.jurusan_id
        WHERE k.is_delete = 0
        GROUP BY k.jurusan_id, k.tahun_kurikulum, j.nama_jurusan`
    );
    const headers = await q('SELECT id, jurusan_id, tahun_kurikulum FROM kurikulum_baru');
    const headerKey = (jurusanId, tahun) => `${jurusanId ?? 'x'}|${tahun ?? 'x'}`;
    const headerBy = new Map(headers.map((h) => [headerKey(h.jurusan_id, h.tahun_kurikulum), h.id]));

    // ---------- 2. Tabel mata kuliah baru (anak) ----------
    await queryInterface.createTable('mata_kuliah_baru', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      kurikulum_id: { type: Sequelize.INTEGER, allowNull: false },
      kode: { type: Sequelize.STRING(30), allowNull: false },
      mata_kuliah: { type: Sequelize.STRING(200), allowNull: false },
      mata_kuliah_en: { type: Sequelize.STRING(200), allowNull: true },
      kelompok_mata_kuliah: { type: Sequelize.ENUM('MPK', 'MKK', 'MKB', 'MPB', 'MBB'), allowNull: true },
      kelompok_kurikulum: { type: Sequelize.ENUM('WAJIB', 'PILIHAN'), allowNull: true },
      jenis_mata_kuliah: { type: Sequelize.ENUM('TEORI', 'PRAKTIK', 'TEORI_PRAKTIK'), allowNull: true },
      sks_teori: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      sks_praktek: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      sks_lab: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      sks_simulasi: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      kelompok_kompetensi: { type: Sequelize.ENUM('UTAMA', 'PENDUKUNG', 'LAINNYA'), allowNull: true },
      komp_ilmu_komputer: { type: Sequelize.STRING(100), allowNull: true },
      mata_kuliah_minat: { type: Sequelize.STRING(100), allowNull: true },
      muatan_mata_kuliah: { type: Sequelize.STRING(255), allowNull: true },
      metode_pembelajaran: { type: Sequelize.STRING(100), allowNull: true },
      id_matkul: { type: Sequelize.STRING(30), allowNull: true },
      semester: { type: Sequelize.INTEGER, allowNull: true },
      silabus: { type: Sequelize.TEXT, allowNull: true },
      is_delete: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      created_by: { type: Sequelize.INTEGER, allowNull: true },
      updated_by: { type: Sequelize.INTEGER, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    const lama = await q('SELECT * FROM kurikulum');
    const masterByKode = new Map((await q('SELECT * FROM mata_kuliah')).map((m) => [m.kode_mk, m]));
    for (const k of lama) {
      let kurikulumId = headerBy.get(headerKey(k.jurusan_id, k.tahun_kurikulum));
      if (!kurikulumId) {
        // Baris terhapus dengan kombinasi yang tidak punya header aktif: buat header nonaktif-terhapus.
        await run(
          `INSERT INTO kurikulum_baru (jurusan_id, tahun_kurikulum, nama, is_active, is_delete, created_at, updated_at)
           VALUES (:jurusan, :tahun, :nama, 0, 1, NOW(), NOW())`,
          { jurusan: k.jurusan_id, tahun: k.tahun_kurikulum, nama: `Kurikulum ${k.tahun_kurikulum ?? ''} (terhapus)`.trim() }
        );
        const [{ id }] = await q('SELECT LAST_INSERT_ID() AS id');
        kurikulumId = id;
        headerBy.set(headerKey(k.jurusan_id, k.tahun_kurikulum), id);
      }
      await run(
        `INSERT INTO mata_kuliah_baru (id, kurikulum_id, kode, mata_kuliah, mata_kuliah_en, kelompok_mata_kuliah, kelompok_kurikulum,
           jenis_mata_kuliah, sks_teori, sks_praktek, sks_lab, sks_simulasi, kelompok_kompetensi, komp_ilmu_komputer, mata_kuliah_minat,
           muatan_mata_kuliah, metode_pembelajaran, id_matkul, semester, silabus, is_delete, created_by, updated_by, created_at, updated_at)
         VALUES (:id, :kurikulumId, :kode, :nama, :namaEn, :kelompokMk, :kelompokKur, :jenis, :teori, :praktek, :lab, :simulasi, :kompetensi,
           :ilmuKomputer, :minat, :muatan, :metode, :idMatkul, :semester, :silabus, :isDelete, :createdBy, :updatedBy, :createdAt, :updatedAt)`,
        {
          id: k.id,
          kurikulumId,
          kode: k.kode,
          nama: k.mata_kuliah,
          namaEn: k.mata_kuliah_en,
          kelompokMk: k.kelompok_mata_kuliah,
          kelompokKur: k.kelompok_kurikulum,
          jenis: k.jenis_mata_kuliah,
          teori: k.sks_teori,
          praktek: k.sks_praktek,
          lab: k.sks_lab,
          simulasi: k.sks_simulasi,
          kompetensi: k.kelompok_kompetensi,
          ilmuKomputer: k.komp_ilmu_komputer,
          minat: k.mata_kuliah_minat,
          muatan: k.muatan_mata_kuliah,
          metode: k.metode_pembelajaran,
          idMatkul: k.id_matkul,
          semester: k.semester,
          silabus: masterByKode.get(k.kode)?.silabus || null,
          isDelete: k.is_delete,
          createdBy: k.created_by,
          updatedBy: k.updated_by,
          createdAt: k.created_at,
          updatedAt: k.updated_at,
        }
      );
    }

    // ---------- 3. jadwal_kuliah → satu mata_kuliah_id ----------
    const mkAktif = await q(
      `SELECT m.id, m.kode, h.tahun_kurikulum, j.kode_prodi
         FROM mata_kuliah_baru m JOIN kurikulum_baru h ON h.id = m.kurikulum_id LEFT JOIN jurusan j ON j.id = h.jurusan_id
        WHERE m.is_delete = 0`
    );
    const jadwalList = await q(
      `SELECT jk.id, jk.kelas, jk.kode_mata_kuliah, jk.nama_mata_kuliah, jk.semester, jk.sks_teori, jk.sks_praktik, jk.sks_lab,
              jk.kurikulum_id, m.kode_mk, m.nama_mk
         FROM jadwal_kuliah jk LEFT JOIN mata_kuliah m ON m.id = jk.mata_kuliah_id`
    );
    const prodiKelas = (kelas) => KODE_PRODI_BY_PREFIX_KELAS[String(kelas ?? '').trim().charAt(0).toUpperCase()] ?? null;
    const target = new Map(); // jadwalId -> mataKuliahId
    for (const j of jadwalList) {
      if (j.kurikulum_id) {
        target.set(j.id, j.kurikulum_id);
        continue;
      }
      const kode = j.kode_mk || j.kode_mata_kuliah;
      const prodi = prodiKelas(j.kelas);
      let kandidat = mkAktif.filter((m) => m.kode === kode);
      const sameProdi = kandidat.filter((m) => m.kode_prodi === prodi);
      if (sameProdi.length) kandidat = sameProdi;
      kandidat.sort((a, b) => (b.tahun_kurikulum ?? 0) - (a.tahun_kurikulum ?? 0));
      if (kandidat.length) {
        target.set(j.id, kandidat[0].id);
        continue;
      }
      // Belum ada di kurikulum mana pun: buat MK di kurikulum terbaru prodi kelasnya.
      const [header] = prodi
        ? await q(
            `SELECT h.id FROM kurikulum_baru h JOIN jurusan jr ON jr.id = h.jurusan_id
              WHERE jr.kode_prodi = :prodi AND h.is_delete = 0 ORDER BY h.tahun_kurikulum DESC, h.id DESC LIMIT 1`,
            { prodi }
          )
        : [];
      if (!header || !kode) continue;
      await run(
        `INSERT INTO mata_kuliah_baru (kurikulum_id, kode, mata_kuliah, sks_teori, sks_praktek, sks_lab, semester, is_delete, created_at, updated_at)
         VALUES (:kurikulumId, :kode, :nama, :teori, :praktek, :lab, :semester, 0, NOW(), NOW())`,
        {
          kurikulumId: header.id,
          kode,
          nama: j.nama_mk || j.nama_mata_kuliah,
          teori: j.sks_teori ?? 0,
          praktek: j.sks_praktik ?? 0,
          lab: j.sks_lab ?? 0,
          semester: j.semester,
        }
      );
      const [{ id }] = await q('SELECT LAST_INSERT_ID() AS id');
      mkAktif.push({ id, kode, tahun_kurikulum: null, kode_prodi: prodi });
      target.set(j.id, id);
    }

    // Lepas FK lama yang menunjuk ke tabel lama.
    const dropFk = async (table, name) => {
      const [fk] = await q(
        `SELECT CONSTRAINT_NAME AS n FROM information_schema.TABLE_CONSTRAINTS
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table AND CONSTRAINT_NAME = :name AND CONSTRAINT_TYPE = 'FOREIGN KEY'`,
        { table, name }
      );
      if (fk) await run(`ALTER TABLE \`${table}\` DROP FOREIGN KEY \`${name}\``);
    };
    await dropFk('jadwal_kuliah', 'jadwal_kuliah_mata_kuliah_id_foreign_idx');
    await dropFk('matakuliah_aktif', 'fk_matakuliah_aktif_kurikulum');
    await dropFk('konversi_kurikulum', 'konversi_kurikulum_ibfk_1');
    await dropFk('konversi_kurikulum', 'konversi_kurikulum_ibfk_2');
    await dropFk('feeder_nilai_transfer', 'feeder_nilai_transfer_ibfk_2');
    await dropFk('kesediaan_mengajar', 'kesediaan_mengajar_ibfk_3');

    await run('UPDATE jadwal_kuliah SET mata_kuliah_id = NULL');
    for (const [jadwalId, mkId] of target) {
      await run('UPDATE jadwal_kuliah SET mata_kuliah_id = :mkId WHERE id = :jadwalId', { mkId, jadwalId });
    }
    await queryInterface.removeIndex('jadwal_kuliah', 'jadwal_kuliah_kurikulum_id_idx').catch(() => {});
    await queryInterface.removeColumn('jadwal_kuliah', 'kurikulum_id');

    // ---------- 4. Kolom relasi lain ----------
    await queryInterface.renameColumn('matakuliah_aktif', 'kurikulum_id', 'mata_kuliah_id');
    await queryInterface.renameColumn('konversi_kurikulum', 'dari_kurikulum_id', 'dari_mata_kuliah_id');
    await queryInterface.renameColumn('konversi_kurikulum', 'ke_kurikulum_id', 'ke_mata_kuliah_id');
    // Master lama → id baru via kode (tabel ini masih kosong saat migrasi dibuat; dipetakan bila ada).
    for (const table of ['feeder_nilai_transfer', 'kesediaan_mengajar']) {
      const rows = await q(`SELECT t.id, m.kode_mk FROM \`${table}\` t JOIN mata_kuliah m ON m.id = t.mata_kuliah_id`);
      for (const r of rows) {
        const mk = mkAktif.filter((m) => m.kode === r.kode_mk).sort((a, b) => (b.tahun_kurikulum ?? 0) - (a.tahun_kurikulum ?? 0))[0];
        await run(`UPDATE \`${table}\` SET mata_kuliah_id = :mk WHERE id = :id`, { mk: mk?.id ?? null, id: r.id });
      }
    }

    // ---------- 5. Tukar tabel ----------
    await queryInterface.renameTable('kurikulum', BAK.kurikulum);
    await queryInterface.renameTable('mata_kuliah', BAK.mataKuliah);
    await queryInterface.renameTable('kurikulum_baru', 'kurikulum');
    await queryInterface.renameTable('mata_kuliah_baru', 'mata_kuliah');

    await queryInterface.addIndex('kurikulum', ['jurusan_id', 'tahun_kurikulum'], { name: 'idx_kurikulum_jurusan_tahun' });
    await queryInterface.addIndex('mata_kuliah', ['kurikulum_id', 'kode'], { name: 'idx_mata_kuliah_kurikulum_kode' });
    await queryInterface.addIndex('mata_kuliah', ['kode'], { name: 'idx_mata_kuliah_kode' });

    const fk = (table, column, refTable, onDelete, name) =>
      queryInterface.addConstraint(table, { fields: [column], type: 'foreign key', name, references: { table: refTable, field: 'id' }, onDelete, onUpdate: 'CASCADE' });
    await fk('kurikulum', 'jurusan_id', 'jurusan', 'SET NULL', 'fk_kurikulum_jurusan');
    await fk('mata_kuliah', 'kurikulum_id', 'kurikulum', 'CASCADE', 'fk_mata_kuliah_kurikulum');
    await fk('jadwal_kuliah', 'mata_kuliah_id', 'mata_kuliah', 'SET NULL', 'fk_jadwal_kuliah_mata_kuliah');
    await fk('matakuliah_aktif', 'mata_kuliah_id', 'mata_kuliah', 'CASCADE', 'fk_matakuliah_aktif_mata_kuliah');
    await fk('konversi_kurikulum', 'dari_mata_kuliah_id', 'mata_kuliah', 'CASCADE', 'fk_konversi_dari_mata_kuliah');
    await fk('konversi_kurikulum', 'ke_mata_kuliah_id', 'mata_kuliah', 'SET NULL', 'fk_konversi_ke_mata_kuliah');
    // mata_kuliah_id di feeder_nilai_transfer NOT NULL → RESTRICT (MK dihapus lewat soft delete).
    await fk('feeder_nilai_transfer', 'mata_kuliah_id', 'mata_kuliah', 'RESTRICT', 'fk_feeder_nilai_transfer_mata_kuliah');
    await fk('kesediaan_mengajar', 'mata_kuliah_id', 'mata_kuliah', 'CASCADE', 'fk_kesediaan_mengajar_mata_kuliah');
  },

  down: async (queryInterface, Sequelize) => {
    // Kembalikan tabel cadangan & relasi jadwal. Data yang dibuat setelah migrasi di tabel baru tidak ikut.
    const db = queryInterface.sequelize;
    const run = (sql) => db.query(sql);
    for (const [table, name] of [
      ['kesediaan_mengajar', 'fk_kesediaan_mengajar_mata_kuliah'],
      ['feeder_nilai_transfer', 'fk_feeder_nilai_transfer_mata_kuliah'],
      ['konversi_kurikulum', 'fk_konversi_ke_mata_kuliah'],
      ['konversi_kurikulum', 'fk_konversi_dari_mata_kuliah'],
      ['matakuliah_aktif', 'fk_matakuliah_aktif_mata_kuliah'],
      ['jadwal_kuliah', 'fk_jadwal_kuliah_mata_kuliah'],
    ]) {
      await queryInterface.removeConstraint(table, name).catch(() => {});
    }
    await queryInterface.renameColumn('konversi_kurikulum', 'ke_mata_kuliah_id', 'ke_kurikulum_id');
    await queryInterface.renameColumn('konversi_kurikulum', 'dari_mata_kuliah_id', 'dari_kurikulum_id');
    await queryInterface.renameColumn('matakuliah_aktif', 'mata_kuliah_id', 'kurikulum_id');
    await queryInterface.addColumn('jadwal_kuliah', 'kurikulum_id', { type: Sequelize.INTEGER, allowNull: true });
    await run(`UPDATE jadwal_kuliah jk JOIN ${BAK.jadwal} b ON b.id = jk.id SET jk.kurikulum_id = b.kurikulum_id, jk.mata_kuliah_id = b.mata_kuliah_id`);
    await queryInterface.dropTable('mata_kuliah');
    await queryInterface.dropTable('kurikulum');
    await queryInterface.renameTable(BAK.kurikulum, 'kurikulum');
    await queryInterface.renameTable(BAK.mataKuliah, 'mata_kuliah');
    await queryInterface.dropTable(BAK.jadwal);
  },
};
