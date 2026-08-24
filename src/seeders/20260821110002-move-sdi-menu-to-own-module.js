'use strict';

const CHILD_CODES = [
  'DOSEN_MANAGEMENT',
  'KARYAWAN_MANAGEMENT',
  'SYNC_FINGER_A1_MANAGEMENT',
  'SYNC_FINGER_A2_MANAGEMENT',
];

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();

    await queryInterface.bulkInsert('menus', [
      {
        parent_id: null,
        name: 'Dashboard',
        code: 'SDI_DASHBOARD',
        path: '/dashboard',
        icon: 'dashboard',
        order_number: 1,
        is_active: true,
        is_public: false,
        module: 'sdi',
        created_at: now,
        updated_at: now,
      },
    ]);

    // Group "SDI" jadi console tersendiri: ganti label jadi "Master" dan pindah modulnya dari baak ke sdi.
    await queryInterface.bulkUpdate(
      'menus',
      { name: 'Master', module: 'sdi', order_number: 2, updated_at: now },
      { code: 'SDI_MANAGEMENT' }
    );

    await queryInterface.bulkUpdate(
      'menus',
      { module: 'sdi', updated_at: now },
      { code: CHILD_CODES }
    );
  },
  down: async (queryInterface) => {
    const now = new Date();

    await queryInterface.bulkUpdate(
      'menus',
      { module: 'baak', updated_at: now },
      { code: CHILD_CODES }
    );

    await queryInterface.bulkUpdate(
      'menus',
      { name: 'SDI', module: 'baak', order_number: 0, updated_at: now },
      { code: 'SDI_MANAGEMENT' }
    );

    await queryInterface.bulkDelete('menus', { code: ['SDI_DASHBOARD'] });
  },
};
