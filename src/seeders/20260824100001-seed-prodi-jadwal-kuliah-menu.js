'use strict';

const CHILDREN = [
  { name: 'Realisasi Dosen', code: 'PRODI_REALISASI_DOSEN_MANAGEMENT', path: '/jadwal-kuliah/realisasi-dosen', icon: 'fact_check' },
  { name: 'Monitoring Jadwal', code: 'PRODI_MONITORING_JADWAL_MANAGEMENT', path: '/jadwal-kuliah/monitoring-jadwal', icon: 'monitoring' },
  { name: 'Jadwal Kuliah', code: 'PRODI_JADWAL_KULIAH_MANAGEMENT', path: '/jadwal-kuliah/jadwal-kuliah', icon: 'event_note' },
  { name: 'Jadwal Ujian', code: 'PRODI_JADWAL_UJIAN_MANAGEMENT', path: '/jadwal-kuliah/jadwal-ujian', icon: 'edit_calendar' },
];

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();

    await queryInterface.bulkInsert('menus', [
      {
        parent_id: null,
        name: 'Jadwal Kuliah',
        code: 'PRODI_JADWAL_KULIAH_GROUP_MANAGEMENT',
        path: null,
        icon: 'event_note',
        order_number: 7,
        is_active: true,
        is_public: false,
        module: 'prodi',
        created_at: now,
        updated_at: now,
      },
    ]);

    const [rows] = await queryInterface.sequelize.query(
      "SELECT id FROM menus WHERE code = 'PRODI_JADWAL_KULIAH_GROUP_MANAGEMENT' LIMIT 1"
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
    await queryInterface.bulkDelete('menus', { code: ['PRODI_JADWAL_KULIAH_GROUP_MANAGEMENT'] });
  },
};
