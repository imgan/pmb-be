'use strict';

/**
 * Dashboard PMB:
 * - peserta.tahun_pmb_id: tahun ajaran PMB saat peserta mendaftar (diisi otomatis = tahun PMB aktif); peserta lama
 *   diisi tahun PMB yang aktif saat migrasi dijalankan.
 * - peserta.sumber_informasi_id: dari mana pendaftar mengetahui kampus (master Sumber Informasi), opsional.
 * - peserta.beasiswa_id: minat jalur pendaftaran (master Beasiswa); NULL = Pembiayaan Mandiri.
 * - tabel target_pmb: target mahasiswa baru per prodi (kode prodi) per tahun PMB.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const fk = (model) => ({ type: Sequelize.INTEGER, allowNull: true, references: { model, key: 'id' }, onDelete: 'SET NULL' });
    await queryInterface.addColumn('peserta', 'tahun_pmb_id', { ...fk('tahun_pmb'), after: 'jurusan_id' });
    await queryInterface.addColumn('peserta', 'sumber_informasi_id', { ...fk('sumber_informasi'), after: 'tahun_pmb_id' });
    await queryInterface.addColumn('peserta', 'beasiswa_id', { ...fk('beasiswa'), after: 'sumber_informasi_id' });
    await queryInterface.sequelize.query(
      `UPDATE peserta SET tahun_pmb_id = (SELECT id FROM tahun_pmb WHERE is_active = 1 ORDER BY id DESC LIMIT 1) WHERE tahun_pmb_id IS NULL`
    );

    await queryInterface.createTable('target_pmb', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      tahun_pmb_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'tahun_pmb', key: 'id' }, onDelete: 'CASCADE' },
      kode_prodi: { type: Sequelize.STRING(20), allowNull: false },
      target: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      created_by: { type: Sequelize.INTEGER, allowNull: true },
      updated_by: { type: Sequelize.INTEGER, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('target_pmb', ['tahun_pmb_id', 'kode_prodi'], { unique: true, name: 'target_pmb_tahun_prodi_unique' });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('target_pmb');
    await queryInterface.removeColumn('peserta', 'beasiswa_id');
    await queryInterface.removeColumn('peserta', 'sumber_informasi_id');
    await queryInterface.removeColumn('peserta', 'tahun_pmb_id');
  },
};
