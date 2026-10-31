'use strict';

/**
 * Matakuliah Aktif: prodi mengaktifkan mata kuliah kurikulum untuk satu tahun akademik/semester,
 * lalu hanya mata kuliah aktif itulah yang bisa dipilih BAAK saat menambah jadwal kuliah.
 *
 * - kurikulum.tahun_kurikulum: tahun kurikulum (2020, 2022, 2023, ...). Sebelumnya "Tahun Kurikulum"
 *   menumpang di tahun_ajaran_id, padahal tahun ajaran = periode semester, bukan angkatan kurikulum.
 *   Diisi awal dari tahun_mulai tahun ajaran yang tersimpan.
 * - matakuliah_aktif: pasangan (tahun ajaran berjalan, baris kurikulum). Beberapa tahun kurikulum
 *   boleh aktif bersamaan dalam satu semester.
 * - jadwal_kuliah.kurikulum_id: mata kuliah kurikulum yang dijadwalkan.
 */
module.exports = {
  up: async (queryInterface) => {
    const q = (sql) => queryInterface.sequelize.query(sql);
    await q('ALTER TABLE kurikulum ADD COLUMN tahun_kurikulum INT NULL AFTER tahun_ajaran_id');
    await q(
      'UPDATE kurikulum k JOIN tahun_ajaran t ON t.id = k.tahun_ajaran_id SET k.tahun_kurikulum = t.tahun_mulai WHERE k.tahun_kurikulum IS NULL'
    );
    await q(`CREATE TABLE matakuliah_aktif (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      tahun_ajaran_id INT NOT NULL,
      kurikulum_id INT NOT NULL,
      created_by INT NULL,
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL,
      UNIQUE KEY uq_matakuliah_aktif (tahun_ajaran_id, kurikulum_id),
      CONSTRAINT fk_matakuliah_aktif_tahun_ajaran FOREIGN KEY (tahun_ajaran_id) REFERENCES tahun_ajaran (id) ON DELETE CASCADE,
      CONSTRAINT fk_matakuliah_aktif_kurikulum FOREIGN KEY (kurikulum_id) REFERENCES kurikulum (id) ON DELETE CASCADE
    )`);
    await q('ALTER TABLE jadwal_kuliah ADD COLUMN kurikulum_id INT NULL AFTER mata_kuliah_id');
  },
  down: async (queryInterface) => {
    const q = (sql) => queryInterface.sequelize.query(sql);
    await q('ALTER TABLE jadwal_kuliah DROP COLUMN kurikulum_id');
    await q('DROP TABLE matakuliah_aktif');
    await q('ALTER TABLE kurikulum DROP COLUMN tahun_kurikulum');
  },
};
