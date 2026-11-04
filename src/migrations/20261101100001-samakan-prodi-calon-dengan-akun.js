'use strict';

/**
 * Akun pendaftar menjadi satu-satunya sumber data PMB: prodi baris menu Peserta yang berbeda disamakan dengan jurusan
 * akunnya. down kosong: nilai prodi lama tidak disimpan.
 */
module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      UPDATE calon_mahasiswa c
        JOIN peserta p ON p.id = c.peserta_id AND p.deleted_at IS NULL
        JOIN jurusan j ON j.id = p.jurusan_id
         SET c.prodi = j.nama_jurusan, c.updated_at = NOW()
       WHERE c.prodi <> j.nama_jurusan`);
  },

  down: async () => {},
};
