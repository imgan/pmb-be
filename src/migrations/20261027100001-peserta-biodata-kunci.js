'use strict';

/**
 * Kunci biodata peserta: setelah peserta menyimpan biodata, data terkunci dan tidak bisa diubah peserta lagi sampai admin
 * PMB menekan "Buka Kunci Data". Biodata yang sudah ada dianggap sudah dikirim → langsung terkunci.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('peserta_biodata', 'is_locked', { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false, after: 'is_agree' });
    await queryInterface.sequelize.query('UPDATE peserta_biodata SET is_locked = 1');
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('peserta_biodata', 'is_locked');
  },
};
