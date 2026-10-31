'use strict';

/**
 * Tugas grup: satu pengumpulan berlaku untuk seluruh anggota grup.
 * - elearning_tugas_jawaban.dikumpulkan_oleh = mahasiswa yang mengunggah (baris anggota lain adalah salinannya);
 * - data lama: pengumpulan tugas bertarget GRUP disalin ke anggota satu grup yang belum punya baris.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('elearning_tugas_jawaban', 'dikumpulkan_oleh', {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: 'mahasiswa_id',
      references: { model: 'mahasiswa', key: 'id' },
      onDelete: 'SET NULL',
    });
    await queryInterface.sequelize.query('UPDATE elearning_tugas_jawaban SET dikumpulkan_oleh = mahasiswa_id WHERE dikumpulkan_oleh IS NULL');
    await queryInterface.sequelize.query(
      `INSERT IGNORE INTO elearning_tugas_jawaban
              (konten_id, mahasiswa_id, dikumpulkan_oleh, isi, lampiran, lampiran_nama, terlambat, nilai, catatan, dinilai_at, created_at, updated_at)
       SELECT tj.konten_id, p2.mahasiswa_id, tj.mahasiswa_id, tj.isi, tj.lampiran, tj.lampiran_nama, tj.terlambat, tj.nilai, tj.catatan, tj.dinilai_at, tj.created_at, tj.updated_at
         FROM elearning_tugas_jawaban tj
         JOIN elearning_konten c ON c.id = tj.konten_id AND c.jenis = 'TUGAS' AND c.target = 'GRUP'
         JOIN elearning_konten_mahasiswa p1 ON p1.konten_id = tj.konten_id AND p1.mahasiswa_id = tj.mahasiswa_id
         JOIN elearning_konten_mahasiswa p2 ON p2.konten_id = tj.konten_id AND p2.grup_ke = p1.grup_ke AND p2.mahasiswa_id <> tj.mahasiswa_id
         LEFT JOIN elearning_tugas_jawaban x ON x.konten_id = tj.konten_id AND x.mahasiswa_id = p2.mahasiswa_id
        WHERE x.id IS NULL
        ORDER BY tj.updated_at DESC`
    );
  },

  down: async (queryInterface) => {
    // Salinan anggota grup dihapus; pengumpulan asli tetap.
    await queryInterface.sequelize.query('DELETE FROM elearning_tugas_jawaban WHERE dikumpulkan_oleh IS NOT NULL AND dikumpulkan_oleh <> mahasiswa_id');
    await queryInterface.removeColumn('elearning_tugas_jawaban', 'dikumpulkan_oleh');
  },
};
