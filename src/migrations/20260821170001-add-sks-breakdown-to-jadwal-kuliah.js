'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('jadwal_kuliah', 'sks_teori', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });
    await queryInterface.addColumn('jadwal_kuliah', 'sks_praktik', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });
    await queryInterface.addColumn('jadwal_kuliah', 'sks_lab', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });

    // Backfill dari data yang sudah ada: mata kuliah "Praktikum ..." dianggap SKS praktik,
    // selain itu dianggap SKS teori (mengikuti nilai `sks` yang sudah diisi lewat form lama).
    await queryInterface.sequelize.query(
      "UPDATE jadwal_kuliah SET sks_praktik = COALESCE(sks, 0) WHERE nama_mata_kuliah LIKE 'Praktikum%'"
    );
    await queryInterface.sequelize.query(
      "UPDATE jadwal_kuliah SET sks_teori = COALESCE(sks, 0) WHERE nama_mata_kuliah NOT LIKE 'Praktikum%'"
    );
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('jadwal_kuliah', 'sks_teori');
    await queryInterface.removeColumn('jadwal_kuliah', 'sks_praktik');
    await queryInterface.removeColumn('jadwal_kuliah', 'sks_lab');
  },
};
