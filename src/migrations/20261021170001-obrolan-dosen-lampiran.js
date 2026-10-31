'use strict';

/**
 * Obrolan lanjutan:
 * - dosen ikut obrolan: grup kelas yang diampu + chat pribadi dosen–mahasiswa (kunci 'D:<dosenId>:<mahasiswaId>');
 *   pengirim pesan / anggota = mahasiswa_id ATAU dosen_id;
 * - lampiran pesan (gambar / file, data URL) + nama, tipe MIME & ukuran.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query('ALTER TABLE obrolan_pesan MODIFY mahasiswa_id INT NULL');
    await queryInterface.addColumn('obrolan_pesan', 'dosen_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: 'mahasiswa_id',
      references: { model: 'dosen', key: 'id' },
      onDelete: 'CASCADE',
    });
    await queryInterface.sequelize.query('ALTER TABLE obrolan_pesan MODIFY isi TEXT NULL');
    await queryInterface.addColumn('obrolan_pesan', 'lampiran', { type: Sequelize.TEXT('long'), allowNull: true, after: 'isi' });
    await queryInterface.addColumn('obrolan_pesan', 'lampiran_nama', { type: Sequelize.STRING(255), allowNull: true, after: 'lampiran' });
    await queryInterface.addColumn('obrolan_pesan', 'lampiran_tipe', { type: Sequelize.STRING(100), allowNull: true, after: 'lampiran_nama' });
    await queryInterface.addColumn('obrolan_pesan', 'lampiran_ukuran', { type: Sequelize.INTEGER, allowNull: true, after: 'lampiran_tipe' });

    await queryInterface.sequelize.query('ALTER TABLE obrolan_anggota MODIFY mahasiswa_id INT NULL');
    await queryInterface.addColumn('obrolan_anggota', 'dosen_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: 'mahasiswa_id',
      references: { model: 'dosen', key: 'id' },
      onDelete: 'CASCADE',
    });
    await queryInterface.addIndex('obrolan_anggota', ['obrolan_id', 'dosen_id'], { unique: true, name: 'obrolan_anggota_obrolan_dosen' });
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query('DELETE FROM obrolan_pesan WHERE mahasiswa_id IS NULL');
    await queryInterface.sequelize.query('DELETE FROM obrolan_anggota WHERE mahasiswa_id IS NULL');
    await queryInterface.sequelize.query("DELETE FROM obrolan WHERE kunci LIKE 'D:%'");
    await queryInterface.removeIndex('obrolan_anggota', 'obrolan_anggota_obrolan_dosen');
    await queryInterface.removeColumn('obrolan_anggota', 'dosen_id');
    await queryInterface.sequelize.query('ALTER TABLE obrolan_anggota MODIFY mahasiswa_id INT NOT NULL');
    for (const kolom of ['lampiran_ukuran', 'lampiran_tipe', 'lampiran_nama', 'lampiran', 'dosen_id']) await queryInterface.removeColumn('obrolan_pesan', kolom);
    await queryInterface.sequelize.query("UPDATE obrolan_pesan SET isi = '' WHERE isi IS NULL");
    await queryInterface.sequelize.query('ALTER TABLE obrolan_pesan MODIFY isi TEXT NOT NULL');
    await queryInterface.sequelize.query('ALTER TABLE obrolan_pesan MODIFY mahasiswa_id INT NOT NULL');
  },
};
