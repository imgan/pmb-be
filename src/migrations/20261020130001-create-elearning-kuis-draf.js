'use strict';

/**
 * E-learning: draf pengerjaan kuis mahasiswa (jawaban sementara, belum dikirim) supaya bisa dilanjutkan nanti /
 * dari perangkat lain. Dihapus otomatis saat jawaban akhir dikirim.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('elearning_kuis_draf', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      konten_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'elearning_konten', key: 'id' }, onDelete: 'CASCADE' },
      mahasiswa_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'mahasiswa', key: 'id' }, onDelete: 'CASCADE' },
      // { [soalId]: indexPilihan | null } (JSON).
      jawaban: { type: Sequelize.TEXT, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('elearning_kuis_draf', ['konten_id', 'mahasiswa_id'], { unique: true });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('elearning_kuis_draf');
  },
};
