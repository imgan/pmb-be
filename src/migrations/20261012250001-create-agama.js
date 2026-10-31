'use strict';

// Master Agama (Modul Admin → Master → Agama). Data awal mengikuti master agama SMART lama
// (kode = kode agama PDDIKTI).
const DATA_AWAL = [
  ['1', 'ISLAM'],
  ['2', 'KRISTEN PROTESTAN'],
  ['3', 'KRISTEN KATOLIK'],
  ['4', 'HINDU'],
  ['5', 'BUDHA'],
];

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('agama', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      kode_agama: { type: Sequelize.STRING(10), allowNull: false },
      nama_agama: { type: Sequelize.STRING(50), allowNull: false },
      is_delete: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      created_by: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      updated_by: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('agama', ['kode_agama', 'is_delete'], { name: 'idx_agama_kode' });
    const now = new Date();
    await queryInterface.bulkInsert(
      'agama',
      DATA_AWAL.map(([kode, nama]) => ({ kode_agama: kode, nama_agama: nama, is_delete: false, created_at: now, updated_at: now }))
    );
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('agama');
  },
};
