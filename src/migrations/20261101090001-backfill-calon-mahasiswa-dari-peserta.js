'use strict';

const { syncFlagDokumen } = require('../utils/statusDokumen');

/**
 * Menu Peserta = seluruh akun pendaftar: akun yang belum punya baris calon_mahasiswa dibuatkan barisnya, supaya jumlahnya
 * sama dengan Dashboard & Reporting. Golongan kelas & jurusan pilihan sengaja tidak diisi (tetap diisi peserta di Data
 * Pendaftaran). down kosong: baris hasil backfill tidak bisa dibedakan dari baris yang dibuat kemudian.
 */
module.exports = {
  up: async (queryInterface) => {
    const q = (sql) => queryInterface.sequelize.query(sql).then(([rows]) => rows);
    const akun = await q(`
      SELECT p.id FROM peserta p
       WHERE p.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM calon_mahasiswa c WHERE c.peserta_id = p.id)`);
    if (!akun.length) return;
    const ids = akun.map((a) => Number(a.id));
    await q(`
      INSERT INTO calon_mahasiswa (peserta_id, nama, asal_sekolah, prodi, no_telepon, sumber_informasi_id, lulus_tes_masuk, status_kuliah, created_at, updated_at)
      SELECT p.id, p.nama_lengkap, COALESCE(p.asal_sekolah, '-'), COALESCE(j.nama_jurusan, '-'), p.no_telepon, p.sumber_informasi_id,
             p.status_ujian = 'lulus', p.status_kelulusan, p.created_at, NOW()
        FROM peserta p LEFT JOIN jurusan j ON j.id = p.jurusan_id
       WHERE p.id IN (${ids.join(',')})`);
    for (const id of ids) await syncFlagDokumen(id);
  },

  down: async () => {},
};
