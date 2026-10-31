'use strict';

/**
 * Popup Sumber Informasi (menu Data Calon Mahasiswa, ikon di kolom aksi — seperti aplikasi PMB lama):
 * sumber informasi kampus, keterangan, kode unik, dan kunci data (terkunci = isian hanya bisa dibaca).
 * Sumber informasi baris yang tertaut ke akun peserta disamakan dengan peserta.sumber_informasi_id.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('calon_mahasiswa', 'sumber_informasi_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: 'no_telepon',
      references: { model: 'sumber_informasi', key: 'id' },
      onDelete: 'SET NULL',
    });
    await queryInterface.addColumn('calon_mahasiswa', 'keterangan_sumber', { type: Sequelize.TEXT, allowNull: true, after: 'sumber_informasi_id' });
    await queryInterface.addColumn('calon_mahasiswa', 'kode_unik', { type: Sequelize.STRING(50), allowNull: true, after: 'keterangan_sumber' });
    await queryInterface.addColumn('calon_mahasiswa', 'sumber_terkunci', { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false, after: 'kode_unik' });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('calon_mahasiswa', 'sumber_terkunci');
    await queryInterface.removeColumn('calon_mahasiswa', 'kode_unik');
    await queryInterface.removeColumn('calon_mahasiswa', 'keterangan_sumber');
    await queryInterface.removeColumn('calon_mahasiswa', 'sumber_informasi_id');
  },
};
