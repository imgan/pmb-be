'use strict';

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();
    const [rows] = await queryInterface.sequelize.query(
      "SELECT id FROM menus WHERE code = 'PRODI_MAHASISWA_GROUP_MANAGEMENT' LIMIT 1"
    );
    const groupId = rows[0].id;

    await queryInterface.bulkInsert('menus', [
      {
        parent_id: groupId,
        name: 'Evaluasi Studi',
        code: 'PRODI_EVALUASI_STUDI_MANAGEMENT',
        path: '/mahasiswa/evaluasi-studi',
        icon: 'fact_check',
        order_number: 7,
        is_active: true,
        is_public: false,
        module: 'prodi',
        created_at: now,
        updated_at: now,
      },
    ]);
  },
  down: async (queryInterface) => {
    await queryInterface.bulkDelete('menus', { code: ['PRODI_EVALUASI_STUDI_MANAGEMENT'] });
  },
};
