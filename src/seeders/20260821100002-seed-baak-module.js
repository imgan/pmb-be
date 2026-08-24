'use strict';

module.exports = {
  up: async (queryInterface) => {
    const [masterGroup] = await queryInterface.sequelize.query(
      "SELECT id FROM menus WHERE code = 'MASTER_DATA_MANAGEMENT' LIMIT 1"
    );
    const masterGroupId = masterGroup[0].id;

    await queryInterface.bulkInsert('menus', [
      {
        parent_id: null,
        name: 'Dashboard',
        code: 'BAAK_DASHBOARD',
        path: '/dashboard',
        icon: 'dashboard',
        order_number: 1,
        is_active: true,
        is_public: false,
        module: 'baak',
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);

    // Pindahkan menu Mahasiswa (sebelumnya di grup Master Data - modul PMB) ke modul BAAK sebagai menu utama.
    await queryInterface.bulkUpdate(
      'menus',
      { parent_id: null, module: 'baak', order_number: 2, updated_at: new Date() },
      { code: 'MAHASISWA_MANAGEMENT', parent_id: masterGroupId }
    );
  },
  down: async (queryInterface) => {
    const [masterGroup] = await queryInterface.sequelize.query(
      "SELECT id FROM menus WHERE code = 'MASTER_DATA_MANAGEMENT' LIMIT 1"
    );
    const masterGroupId = masterGroup[0].id;

    await queryInterface.bulkUpdate(
      'menus',
      { parent_id: masterGroupId, module: 'pmb', order_number: 15, updated_at: new Date() },
      { code: 'MAHASISWA_MANAGEMENT' }
    );

    await queryInterface.bulkDelete('menus', { code: ['BAAK_DASHBOARD'] });
  },
};
