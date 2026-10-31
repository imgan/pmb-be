'use strict';

/**
 * E-learning: interaksi pada konten (timeline) — suka & komentar. Pelaku bisa dosen ATAU mahasiswa (salah satu kolom
 * dosen_id / mahasiswa_id terisi).
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const waktu = {
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    };
    const pelaku = {
      konten_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'elearning_konten', key: 'id' }, onDelete: 'CASCADE' },
      dosen_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'dosen', key: 'id' }, onDelete: 'CASCADE' },
      mahasiswa_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'mahasiswa', key: 'id' }, onDelete: 'CASCADE' },
    };
    await queryInterface.createTable('elearning_suka', { id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true }, ...pelaku, ...waktu });
    await queryInterface.addIndex('elearning_suka', ['konten_id', 'dosen_id', 'mahasiswa_id'], { unique: true, name: 'elearning_suka_unik' });
    await queryInterface.createTable('elearning_komentar', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      ...pelaku,
      isi: { type: Sequelize.TEXT, allowNull: false },
      ...waktu,
    });
    await queryInterface.addIndex('elearning_komentar', ['konten_id']);
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('elearning_komentar');
    await queryInterface.dropTable('elearning_suka');
  },
};
