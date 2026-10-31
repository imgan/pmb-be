'use strict';

/**
 * Kelas "Pindahan" membuka program studi yang sama dengan kelas "Reguler": salin semua jurusan Reguler (aktif) menjadi
 * varian golongan kelas Pindahan — nama, kode prodi, jenjang, gelar, fakultas, foto & prospek karir sama. Kode prodi
 * yang sama membuat modul Prodi tetap menganggapnya satu prodi. Prodi yang sudah ada di Pindahan (kode sama) dilewati.
 */
const KOLOM = 'nama_jurusan, kode_prodi, singkatan, foto, prospek_karir, jenjang_pendidikan, gelar_singkat, gelar_lengkap, nama_fakultas';

module.exports = {
  up: async (queryInterface) => {
    const q = (sql, replacements) => queryInterface.sequelize.query(sql, { replacements, type: queryInterface.sequelize.QueryTypes.SELECT });
    const [reguler] = await q("SELECT id FROM golongan_kelas WHERE nama_kelas = 'Reguler' LIMIT 1");
    const [pindahan] = await q("SELECT id FROM golongan_kelas WHERE nama_kelas = 'Pindahan' LIMIT 1");
    if (!reguler || !pindahan) return;
    await queryInterface.sequelize.query(
      `INSERT INTO jurusan (golongan_kelas_id, ${KOLOM}, is_delete, created_at, updated_at)
       SELECT :pindahan, ${KOLOM}, 0, NOW(), NOW() FROM jurusan r
        WHERE r.golongan_kelas_id = :reguler AND r.is_delete = 0
          AND NOT EXISTS (SELECT 1 FROM jurusan p WHERE p.golongan_kelas_id = :pindahan AND p.is_delete = 0 AND p.kode_prodi <=> r.kode_prodi AND p.nama_jurusan = r.nama_jurusan)
        ORDER BY r.id`,
      { replacements: { reguler: reguler.id, pindahan: pindahan.id } }
    );
  },

  down: async (queryInterface) => {
    // Hanya baris salinan migrasi ini (dibuat tanpa created_by) yang dihapus.
    await queryInterface.sequelize.query(
      `DELETE j FROM jurusan j JOIN golongan_kelas g ON g.id = j.golongan_kelas_id
        WHERE g.nama_kelas = 'Pindahan' AND j.created_by IS NULL
          AND EXISTS (SELECT 1 FROM (SELECT r.kode_prodi, r.nama_jurusan FROM jurusan r JOIN golongan_kelas rg ON rg.id = r.golongan_kelas_id WHERE rg.nama_kelas = 'Reguler') x
                       WHERE x.kode_prodi <=> j.kode_prodi AND x.nama_jurusan = j.nama_jurusan)`
    );
  },
};
