'use strict';

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.bulkInsert('menus', [
      {
        parent_id: null,
        name: 'Informasi',
        code: 'INFORMASI_MANAGEMENT',
        path: null,
        icon: 'info',
        order_number: 14,
        is_active: true,
        is_public: false,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);

    const [rows] = await queryInterface.sequelize.query(
      "SELECT id FROM menus WHERE code = 'INFORMASI_MANAGEMENT' LIMIT 1"
    );
    const groupId = rows[0].id;

    await queryInterface.bulkInsert('menus', [
      {
        parent_id: groupId,
        name: 'Data Calon Mahasiswa Baru',
        code: 'CALON_MAHASISWA_MANAGEMENT',
        path: '/calon-mahasiswa',
        icon: 'assignment_ind',
        order_number: 1,
        is_active: true,
        is_public: false,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  },
  down: async (queryInterface) => {
    await queryInterface.bulkDelete('menus', { code: ['CALON_MAHASISWA_MANAGEMENT', 'INFORMASI_MANAGEMENT'] });
  },
};
