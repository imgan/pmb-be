'use strict';

const CHILDREN = [
  { name: 'Dosen', code: 'DOSEN_MANAGEMENT', path: '/sdi/dosen', icon: 'school', orderNumber: 1 },
  { name: 'Karyawan', code: 'KARYAWAN_MANAGEMENT', path: '/sdi/karyawan', icon: 'badge', orderNumber: 2 },
  { name: 'Sync Finger A1', code: 'SYNC_FINGER_A1_MANAGEMENT', path: '/sdi/sync-finger-a1', icon: 'fingerprint', orderNumber: 3 },
  { name: 'Sync Finger A2', code: 'SYNC_FINGER_A2_MANAGEMENT', path: '/sdi/sync-finger-a2', icon: 'fingerprint', orderNumber: 4 },
];

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();

    await queryInterface.bulkInsert('menus', [
      {
        parent_id: null,
        name: 'SDI',
        code: 'SDI_MANAGEMENT',
        path: null,
        icon: 'groups',
        order_number: 0,
        is_active: true,
        is_public: false,
        module: 'baak',
        created_at: now,
        updated_at: now,
      },
    ]);

    const [rows] = await queryInterface.sequelize.query("SELECT id FROM menus WHERE code = 'SDI_MANAGEMENT' LIMIT 1");
    const sdiGroupId = rows[0].id;

    await queryInterface.bulkInsert(
      'menus',
      CHILDREN.map((child) => ({
        parent_id: sdiGroupId,
        name: child.name,
        code: child.code,
        path: child.path,
        icon: child.icon,
        order_number: child.orderNumber,
        is_active: true,
        is_public: false,
        module: 'baak',
        created_at: now,
        updated_at: now,
      }))
    );
  },
  down: async (queryInterface) => {
    await queryInterface.bulkDelete('menus', { code: CHILDREN.map((child) => child.code) });
    await queryInterface.bulkDelete('menus', { code: ['SDI_MANAGEMENT'] });
  },
};
