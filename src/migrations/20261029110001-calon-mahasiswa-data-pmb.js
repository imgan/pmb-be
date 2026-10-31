'use strict';

/**
 * Popup Sumber Informasi 2 (menu Data Calon Mahasiswa): kelas perkuliahan, skema pembayaran (beasiswa), ukuran
 * almamater, gelombang, jurusan pilihan 1–3, dan kunci data sendiri (terpisah dari kunci Sumber Informasi).
 * Gelombang memakai kolom gelombang_id yang sudah ada.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const fk = (model) => ({ type: Sequelize.INTEGER, allowNull: true, references: { model, key: 'id' }, onDelete: 'SET NULL' });
    await queryInterface.addColumn('calon_mahasiswa', 'golongan_kelas_id', { ...fk('golongan_kelas'), after: 'sumber_terkunci' });
    await queryInterface.addColumn('calon_mahasiswa', 'beasiswa_id', { ...fk('beasiswa'), after: 'golongan_kelas_id' });
    await queryInterface.addColumn('calon_mahasiswa', 'ukuran_almamater', { type: Sequelize.STRING(20), allowNull: true, after: 'beasiswa_id' });
    await queryInterface.addColumn('calon_mahasiswa', 'jurusan1_id', { ...fk('jurusan'), after: 'ukuran_almamater' });
    await queryInterface.addColumn('calon_mahasiswa', 'jurusan2_id', { ...fk('jurusan'), after: 'jurusan1_id' });
    await queryInterface.addColumn('calon_mahasiswa', 'jurusan3_id', { ...fk('jurusan'), after: 'jurusan2_id' });
    await queryInterface.addColumn('calon_mahasiswa', 'data_pmb_terkunci', { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false, after: 'jurusan3_id' });
  },
  down: async (queryInterface) => {
    for (const col of ['data_pmb_terkunci', 'jurusan3_id', 'jurusan2_id', 'jurusan1_id', 'ukuran_almamater', 'beasiswa_id', 'golongan_kelas_id']) {
      await queryInterface.removeColumn('calon_mahasiswa', col);
    }
  },
};
