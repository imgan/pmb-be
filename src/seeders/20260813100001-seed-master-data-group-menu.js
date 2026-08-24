'use strict';

const MASTER_DATA_CODES = [
  'GOLONGAN_KELAS_MANAGEMENT',
  'JURUSAN_MANAGEMENT',
  'SUMBER_INFORMASI_MANAGEMENT',
  'UKURAN_ALMAMATER_MANAGEMENT',
  'PEMBAYARAN_MANAGEMENT',
  'DOKUMEN_PENDAFTARAN_MANAGEMENT',
  'DOKUMEN_KELENGKAPAN_MANAGEMENT',
  'GELOMBANG_MANAGEMENT',
];

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.bulkInsert('menus', [
      {
        name: 'Master Data',
        code: 'MASTER_DATA_MANAGEMENT',
        path: null,
        icon: 'layers',
        order_number: 5,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);

    const [rows] = await queryInterface.sequelize.query(
      "SELECT id FROM menus WHERE code = 'MASTER_DATA_MANAGEMENT' LIMIT 1"
    );
    const groupId = rows[0].id;

    await queryInterface.bulkUpdate(
      'menus',
      { parent_id: groupId },
      { code: MASTER_DATA_CODES }
    );
  },
  down: async (queryInterface) => {
    await queryInterface.bulkUpdate('menus', { parent_id: null }, { code: MASTER_DATA_CODES });
    await queryInterface.bulkDelete('menus', { code: ['MASTER_DATA_MANAGEMENT'] });
  },
};
