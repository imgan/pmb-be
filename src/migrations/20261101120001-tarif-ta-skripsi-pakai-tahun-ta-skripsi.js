'use strict';

/**
 * Tarif TA/Skripsi memakai Tahun TA/Skripsi (Modul Admin › Master), bukan tahun akademik. Data lama dipindahkan lewat
 * kecocokan nama + semester.
 */
const FK_LAMA = 'tarif_ta_skripsi_tahun_ajaran_id_foreign_idx';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('tarif_ta_skripsi', 'tahun_ta_skripsi_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: 'periode',
      references: { model: 'tahun_ta_skripsi', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
    await queryInterface.sequelize.query(`
      UPDATE tarif_ta_skripsi t
        JOIN tahun_ajaran a ON a.id = t.tahun_ajaran_id
        JOIN tahun_ta_skripsi b ON b.nama = a.nama AND b.jenis_semester = a.jenis_semester AND b.is_delete = 0
         SET t.tahun_ta_skripsi_id = b.id`);
    await queryInterface.removeConstraint('tarif_ta_skripsi', FK_LAMA);
    await queryInterface.removeColumn('tarif_ta_skripsi', 'tahun_ajaran_id');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('tarif_ta_skripsi', 'tahun_ajaran_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'tahun_ajaran', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
    await queryInterface.sequelize.query(`
      UPDATE tarif_ta_skripsi t
        JOIN tahun_ta_skripsi b ON b.id = t.tahun_ta_skripsi_id
        JOIN tahun_ajaran a ON a.nama = b.nama AND a.jenis_semester = b.jenis_semester
         SET t.tahun_ajaran_id = a.id`);
    await queryInterface.removeColumn('tarif_ta_skripsi', 'tahun_ta_skripsi_id');
  },
};
