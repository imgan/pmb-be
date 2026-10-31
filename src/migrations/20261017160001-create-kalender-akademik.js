'use strict';

/**
 * Kalender akademik (BAAK): kegiatan per tahun akademik dengan rentang tanggal & kategori
 * (KKN, PKL, Perkuliahan, Libur, Wisuda, dst. — daftar di routes/kalenderAkademik.route.js).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('kalender_akademik', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      tahun_ajaran_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'tahun_ajaran', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      nama_kegiatan: { type: Sequelize.STRING(200), allowNull: false },
      kategori: { type: Sequelize.STRING(30), allowNull: false, defaultValue: 'LAINNYA' },
      tanggal_mulai: { type: Sequelize.DATEONLY, allowNull: false },
      tanggal_selesai: { type: Sequelize.DATEONLY, allowNull: false },
      keterangan: { type: Sequelize.TEXT, allowNull: true },
      created_by: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      updated_by: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('kalender_akademik', ['tahun_ajaran_id', 'tanggal_mulai'], { name: 'kalender_akademik_periode' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('kalender_akademik');
  },
};
