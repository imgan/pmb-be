'use strict';

/**
 * E-learning: prasyarat konten & progres mahasiswa.
 * - elearning_konten.prasyarat_id: konten (kelas yang sama) yang harus diselesaikan dulu sebelum konten ini bisa dibuka.
 * - elearning_progres: materi / video yang ditandai selesai (dipelajari / ditonton) oleh mahasiswa. Kuis dianggap
 *   selesai bila sudah ada jawaban di elearning_jawaban.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('elearning_konten', 'prasyarat_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: 'is_wajib',
      references: { model: 'elearning_konten', key: 'id' },
      onDelete: 'SET NULL',
    });
    await queryInterface.createTable('elearning_progres', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      konten_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'elearning_konten', key: 'id' }, onDelete: 'CASCADE' },
      mahasiswa_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'mahasiswa', key: 'id' }, onDelete: 'CASCADE' },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('elearning_progres', ['konten_id', 'mahasiswa_id'], { unique: true });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('elearning_progres');
    await queryInterface.removeConstraint('elearning_konten', 'elearning_konten_prasyarat_id_foreign_idx').catch(() => {});
    await queryInterface.removeColumn('elearning_konten', 'prasyarat_id');
  },
};
