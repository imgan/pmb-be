'use strict';

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.bulkInsert('menus', [
      {
        name: 'Informasi',
        code: 'INFORMASI_MANAGEMENT',
        path: null,
        icon: 'info',
        order_number: 6,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);

    const [rows] = await queryInterface.sequelize.query(
      "SELECT id FROM menus WHERE code = 'INFORMASI_MANAGEMENT' LIMIT 1"
    );
    const groupId = rows[0].id;

    await queryInterface.bulkUpdate(
      'menus',
      { parent_id: groupId, name: 'Data Calon Mahasiswa', order_number: 1 },
      { code: 'PESERTA_MANAGEMENT' }
    );
    await queryInterface.bulkUpdate(
      'menus',
      { parent_id: groupId, name: 'Biaya Kuliah', order_number: 2 },
      { code: 'PEMBAYARAN_MANAGEMENT' }
    );
  },
  down: async (queryInterface) => {
    const [masterDataRows] = await queryInterface.sequelize.query(
      "SELECT id FROM menus WHERE code = 'MASTER_DATA_MANAGEMENT' LIMIT 1"
    );
    const masterDataId = masterDataRows[0].id;

    await queryInterface.bulkUpdate(
      'menus',
      { parent_id: null, name: 'Peserta', order_number: 13 },
      { code: 'PESERTA_MANAGEMENT' }
    );
    await queryInterface.bulkUpdate(
      'menus',
      { parent_id: masterDataId, name: 'Pembayaran', order_number: 9 },
      { code: 'PEMBAYARAN_MANAGEMENT' }
    );
    await queryInterface.bulkDelete('menus', { code: ['INFORMASI_MANAGEMENT'] });
  },
};
