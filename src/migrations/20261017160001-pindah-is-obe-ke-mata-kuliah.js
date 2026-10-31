'use strict';

// OBE / Non OBE melekat ke mata kuliah, bukan ke kurikulum: kolom is_obe dipindah ke mata_kuliah.
// (kurikulum.is_obe baru dibuat & belum pernah diisi — semua bernilai false.)
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('mata_kuliah', 'is_obe', { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false, after: 'semester' });
    await queryInterface.removeColumn('kurikulum', 'is_obe');
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('kurikulum', 'is_obe', { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false, after: 'nama' });
    await queryInterface.removeColumn('mata_kuliah', 'is_obe');
  },
};
