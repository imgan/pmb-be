'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Koreksi manual untuk kasus khusus (jarang, per-mahasiswa) — kalau diisi, dipakai
    // menggantikan hasil hitungan otomatis (hitungSemesterBerjalan) untuk mahasiswa ini saja.
    // Null berarti tetap pakai hitungan otomatis seperti biasa.
    await queryInterface.addColumn('mahasiswa', 'semester_override', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('mahasiswa', 'semester_override');
  },
};
