'use strict';

const PATH_FIXES = [
  { code: 'DOSEN_MANAGEMENT', path: '/dosen' },
  { code: 'KARYAWAN_MANAGEMENT', path: '/karyawan' },
  { code: 'SYNC_FINGER_A1_MANAGEMENT', path: '/sync-finger-a1' },
  { code: 'SYNC_FINGER_A2_MANAGEMENT', path: '/sync-finger-a2' },
];

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();
    for (const fix of PATH_FIXES) {
      await queryInterface.bulkUpdate('menus', { path: fix.path, updated_at: now }, { code: fix.code });
    }
  },
  down: async (queryInterface) => {
    const now = new Date();
    for (const fix of PATH_FIXES) {
      await queryInterface.bulkUpdate('menus', { path: `/sdi${fix.path}`, updated_at: now }, { code: fix.code });
    }
  },
};
