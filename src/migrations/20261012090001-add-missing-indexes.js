'use strict';

/**
 * Index yang belum ada pada kolom yang sering dipakai join/filter (hasil audit information_schema):
 * - jadwal_kuliah.kurikulum_id, kurikulum.jurusan_id/tahun_ajaran_id: join jadwal <-> kurikulum <-> prodi.
 * - kurikulum (jurusan_id, semester): daftar kurikulum per prodi & semester.
 * - nilai_mahasiswa (mahasiswa_id, kode_mata_kuliah, semester): upsert import nilai, KHS, transkrip.
 * - mahasiswa.email: login portal mahasiswa memakai email.
 * Index yang sudah ada dilewati, jadi aman dijalankan ulang.
 */
const INDEXES = [
  { table: 'jadwal_kuliah', name: 'jadwal_kuliah_kurikulum_id_idx', fields: ['kurikulum_id'] },
  { table: 'kurikulum', name: 'kurikulum_jurusan_semester_idx', fields: ['jurusan_id', 'semester'] },
  { table: 'kurikulum', name: 'kurikulum_tahun_ajaran_id_idx', fields: ['tahun_ajaran_id'] },
  { table: 'nilai_mahasiswa', name: 'nilai_mahasiswa_mhs_kode_semester_idx', fields: ['mahasiswa_id', 'kode_mata_kuliah', 'semester'] },
  { table: 'mahasiswa', name: 'mahasiswa_email_idx', fields: ['email'] },
];

const exists = async (queryInterface, table, name) => {
  const [rows] = await queryInterface.sequelize.query(
    'SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table AND INDEX_NAME = :name LIMIT 1',
    { replacements: { table, name } }
  );
  return rows.length > 0;
};

module.exports = {
  up: async (queryInterface) => {
    for (const { table, name, fields } of INDEXES) {
      if (!(await exists(queryInterface, table, name))) await queryInterface.addIndex(table, fields, { name });
    }
  },
  down: async (queryInterface) => {
    for (const { table, name } of INDEXES) {
      if (await exists(queryInterface, table, name)) await queryInterface.removeIndex(table, name);
    }
  },
};
