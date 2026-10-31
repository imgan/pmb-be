'use strict';

/**
 * E-learning: jumlah konten dilihat per mahasiswa (satu baris per konten × mahasiswa; jumlah bertambah setiap kali
 * mahasiswa membuka konten). Total dilihat = Σ jumlah; jumlah mahasiswa unik = COUNT baris.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('elearning_lihat', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      konten_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'elearning_konten', key: 'id' }, onDelete: 'CASCADE' },
      mahasiswa_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'mahasiswa', key: 'id' }, onDelete: 'CASCADE' },
      jumlah: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('elearning_lihat', ['konten_id', 'mahasiswa_id'], { unique: true });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('elearning_lihat');
  },
};
