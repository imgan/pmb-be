'use strict';

/**
 * Matakuliah Aktif per (tahun akademik, aktif semester, mata kuliah kurikulum) — sesuai menu lama:
 * mata kuliah kurikulum dibuka untuk semester tertentu di tahun akademik tsb (mis. MK semester 1
 * kurikulum 2020 aktif di semester 1 TA 2025/2026 Ganjil). Satu MK boleh aktif di lebih dari satu
 * semester pada tahun akademik yang sama.
 */
module.exports = {
  up: async (queryInterface) => {
    const q = (sql) => queryInterface.sequelize.query(sql);
    await q('ALTER TABLE matakuliah_aktif ADD COLUMN semester INT NULL AFTER kurikulum_id');
    await q(
      'UPDATE matakuliah_aktif ma JOIN kurikulum k ON k.id = ma.kurikulum_id SET ma.semester = COALESCE(k.semester, 1) WHERE ma.semester IS NULL'
    );
    await q('UPDATE matakuliah_aktif SET semester = 1 WHERE semester IS NULL');
    await q('ALTER TABLE matakuliah_aktif MODIFY semester INT NOT NULL');
    // Index baru dibuat dulu supaya FK tahun_ajaran_id tetap punya index saat index lama dihapus.
    await q('ALTER TABLE matakuliah_aktif ADD UNIQUE KEY uq_matakuliah_aktif_semester (tahun_ajaran_id, kurikulum_id, semester)');
    await q('ALTER TABLE matakuliah_aktif DROP INDEX uq_matakuliah_aktif');
  },
  down: async (queryInterface) => {
    const q = (sql) => queryInterface.sequelize.query(sql);
    await q('DELETE ma1 FROM matakuliah_aktif ma1 JOIN matakuliah_aktif ma2 ON ma1.tahun_ajaran_id = ma2.tahun_ajaran_id AND ma1.kurikulum_id = ma2.kurikulum_id AND ma1.id > ma2.id');
    await q('ALTER TABLE matakuliah_aktif ADD UNIQUE KEY uq_matakuliah_aktif (tahun_ajaran_id, kurikulum_id)');
    await q('ALTER TABLE matakuliah_aktif DROP INDEX uq_matakuliah_aktif_semester');
    await q('ALTER TABLE matakuliah_aktif DROP COLUMN semester');
  },
};
