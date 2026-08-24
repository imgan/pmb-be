'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('jadwal_sidang', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      tahun_ajaran_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'tahun_ajaran', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      semester: { type: Sequelize.ENUM('GANJIL', 'GENAP'), allowNull: false },
      jurusan_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'jurusan', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      tanggal: { type: Sequelize.DATEONLY, allowNull: false },
      jam: { type: Sequelize.STRING(30), allowNull: false },
      ruangan: { type: Sequelize.STRING(100), allowNull: true },
      no_sk: { type: Sequelize.STRING(100), allowNull: true },
      dosen_penguji_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'dosen', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      is_delete: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      created_by: { type: Sequelize.INTEGER, allowNull: true },
      updated_by: { type: Sequelize.INTEGER, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('jadwal_sidang', ['tahun_ajaran_id', 'semester']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('jadwal_sidang');
  },
};
