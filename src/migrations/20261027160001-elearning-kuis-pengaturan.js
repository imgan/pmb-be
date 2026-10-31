'use strict';

/**
 * Pengaturan kuis: durasi pengerjaan (menit, dihitung sejak mahasiswa menekan "Mulai"), acak urutan soal, dan
 * tampilkan nilai / pembahasan ke mahasiswa setelah kuis dikirim. Kuis lama tetap menampilkan hasil (default 1).
 * Draf kuis mencatat waktu mulai pengerjaan.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('elearning_konten', 'durasi_menit', { type: Sequelize.INTEGER, allowNull: true, after: 'tenggat' });
    await queryInterface.addColumn('elearning_konten', 'acak_soal', { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false, after: 'durasi_menit' });
    await queryInterface.addColumn('elearning_konten', 'tampilkan_hasil', { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true, after: 'acak_soal' });
    await queryInterface.addColumn('elearning_kuis_draf', 'mulai_at', { type: Sequelize.DATE, allowNull: true, after: 'jawaban' });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('elearning_kuis_draf', 'mulai_at');
    await queryInterface.removeColumn('elearning_konten', 'tampilkan_hasil');
    await queryInterface.removeColumn('elearning_konten', 'acak_soal');
    await queryInterface.removeColumn('elearning_konten', 'durasi_menit');
  },
};
