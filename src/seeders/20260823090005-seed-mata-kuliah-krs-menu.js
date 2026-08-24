'use strict';

const SHIFT_CODES = [
  'BAAK_AUDIT_LOG_MANAGEMENT',
  'NILAI_MONITORING_MANAGEMENT',
  'YUDISIUM_MANAGEMENT',
  'BAAK_LAPORAN_MANAGEMENT',
  'BAAK_README_MANAGEMENT',
];

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();

    // Geser menu setelah "Jadwal Kuliah" (order 6) maju 2 nomor, untuk memberi ruang bagi
    // "Mata Kuliah" (order 7) dan "KRS Mahasiswa" (order 8).
    for (let i = 0; i < SHIFT_CODES.length; i += 1) {
      await queryInterface.bulkUpdate(
        'menus',
        { order_number: 9 + i, updated_at: now },
        { code: SHIFT_CODES[i] }
      );
    }

    await queryInterface.bulkInsert('menus', [
      {
        parent_id: null,
        name: 'Mata Kuliah',
        code: 'MATA_KULIAH_MANAGEMENT',
        path: '/mata-kuliah',
        icon: 'menu_book',
        order_number: 7,
        is_active: true,
        is_public: false,
        module: 'baak',
        created_at: now,
        updated_at: now,
      },
      {
        parent_id: null,
        name: 'KRS Mahasiswa',
        code: 'KRS_MANAGEMENT',
        path: '/krs',
        icon: 'fact_check',
        order_number: 8,
        is_active: true,
        is_public: false,
        module: 'baak',
        created_at: now,
        updated_at: now,
      },
    ]);
  },
  down: async (queryInterface) => {
    const now = new Date();
    await queryInterface.bulkDelete('menus', { code: ['MATA_KULIAH_MANAGEMENT', 'KRS_MANAGEMENT'] });
    for (let i = 0; i < SHIFT_CODES.length; i += 1) {
      await queryInterface.bulkUpdate(
        'menus',
        { order_number: 7 + i, updated_at: now },
        { code: SHIFT_CODES[i] }
      );
    }
  },
};
