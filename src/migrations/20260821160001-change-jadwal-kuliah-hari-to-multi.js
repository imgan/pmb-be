'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('jadwal_kuliah', 'hari_new', { type: Sequelize.JSON, allowNull: true });
    await queryInterface.sequelize.query('UPDATE jadwal_kuliah SET hari_new = JSON_ARRAY(hari) WHERE hari IS NOT NULL');
    await queryInterface.removeColumn('jadwal_kuliah', 'hari');
    await queryInterface.renameColumn('jadwal_kuliah', 'hari_new', 'hari');
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('jadwal_kuliah', 'hari_old', {
      type: Sequelize.ENUM('SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'),
      allowNull: true,
    });
    await queryInterface.sequelize.query(
      "UPDATE jadwal_kuliah SET hari_old = JSON_UNQUOTE(JSON_EXTRACT(hari, '$[0]')) WHERE hari IS NOT NULL"
    );
    await queryInterface.removeColumn('jadwal_kuliah', 'hari');
    await queryInterface.renameColumn('jadwal_kuliah', 'hari_old', 'hari');
  },
};
