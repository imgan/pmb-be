'use strict';

const CHILDREN = [
  { name: 'Kurikulum', code: 'PRODI_KURIKULUM_MANAGEMENT', path: '/kurikulum/kurikulum', icon: 'menu_book' },
  { name: 'Matakuliah Aktif', code: 'PRODI_MATAKULIAH_AKTIF_MANAGEMENT', path: '/kurikulum/matakuliah-aktif', icon: 'auto_stories' },
  { name: 'Konversi Kurikulum', code: 'PRODI_KONVERSI_KURIKULUM_MANAGEMENT', path: '/kurikulum/konversi-kurikulum', icon: 'sync_alt' },
];

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();

    await queryInterface.bulkInsert('menus', [
      {
        parent_id: null,
        name: 'Kurikulum',
        code: 'PRODI_KURIKULUM_GROUP_MANAGEMENT',
        path: null,
        icon: 'menu_book',
        order_number: 8,
        is_active: true,
        is_public: false,
        module: 'prodi',
        created_at: now,
        updated_at: now,
      },
    ]);

    const [rows] = await queryInterface.sequelize.query(
      "SELECT id FROM menus WHERE code = 'PRODI_KURIKULUM_GROUP_MANAGEMENT' LIMIT 1"
    );
    const groupId = rows[0].id;

    await queryInterface.bulkInsert(
      'menus',
      CHILDREN.map((child, index) => ({
        parent_id: groupId,
        name: child.name,
        code: child.code,
        path: child.path,
        icon: child.icon,
        order_number: index + 1,
        is_active: true,
        is_public: false,
        module: 'prodi',
        created_at: now,
        updated_at: now,
      }))
    );
  },
  down: async (queryInterface) => {
    await queryInterface.bulkDelete('menus', { code: CHILDREN.map((c) => c.code) });
    await queryInterface.bulkDelete('menus', { code: ['PRODI_KURIKULUM_GROUP_MANAGEMENT'] });
  },
};
