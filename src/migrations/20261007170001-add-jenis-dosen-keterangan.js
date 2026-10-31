'use strict';

// Penanda dosen internal (homebase Poltek) vs eksternal (dosen luar/LB, termasuk staf struktural
// yang ikut mengajar), plus keterangan bebas (mis. "Struktural").
module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query(
      "ALTER TABLE dosen ADD COLUMN jenis_dosen ENUM('INTERNAL','EKSTERNAL') NOT NULL DEFAULT 'INTERNAL' AFTER status_dosen"
    );
    await queryInterface.sequelize.query('ALTER TABLE dosen ADD COLUMN keterangan VARCHAR(100) NULL AFTER jenis_dosen');
  },
  down: async (queryInterface) => {
    await queryInterface.sequelize.query('ALTER TABLE dosen DROP COLUMN keterangan');
    await queryInterface.sequelize.query('ALTER TABLE dosen DROP COLUMN jenis_dosen');
  },
};
