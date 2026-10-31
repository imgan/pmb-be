'use strict';

// Konfigurasi batas tagihan per prodi untuk akses akademik mahasiswa (isi KRS & lihat nilai).
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('batas_tagihan_akademik', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      jurusan_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: { model: 'jurusan', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      krs_aktif: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      batas_krs: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
      nilai_aktif: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      batas_nilai: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
      created_by: { type: Sequelize.INTEGER, allowNull: true },
      updated_by: { type: Sequelize.INTEGER, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('batas_tagihan_akademik');
  },
};
