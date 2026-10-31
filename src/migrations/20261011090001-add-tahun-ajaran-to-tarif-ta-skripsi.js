'use strict';

/** Master Tarif TA/Skripsi dicatat per Tahun Akademik (selain periode & prodi). */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('tarif_ta_skripsi', 'tahun_ajaran_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: 'periode',
      references: { model: 'tahun_ajaran', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('tarif_ta_skripsi', 'tahun_ajaran_id');
  },
};
