'use strict';

// Bobot OBE per jadwal kuliah (kelas): persentase komponen nilai yang ditetapkan dosen pengampu
// sebelum menginput nilai (total wajib 100%); prodi bisa mengubah/menghapus. Nilai akhir kelas tsb
// dihitung memakai bobot ini.
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const persen = { type: Sequelize.DECIMAL(5, 2), allowNull: false, defaultValue: 0 };
    await queryInterface.createTable('bobot_obe', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      jadwal_kuliah_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: { model: 'jadwal_kuliah', key: 'id' },
        onDelete: 'CASCADE',
      },
      partisipatif: persen,
      tugas: persen,
      quiz: persen,
      proyek: persen,
      uts: persen,
      uas: persen,
      // Catatan CPMK / dasar pembobotan (opsional).
      keterangan: { type: Sequelize.TEXT, allowNull: true },
      // Pengubah terakhir: dosen (portal dosen) atau user prodi.
      dosen_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'dosen', key: 'id' }, onDelete: 'SET NULL' },
      updated_by: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('bobot_obe');
  },
};
