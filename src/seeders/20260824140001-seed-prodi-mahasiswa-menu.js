'use strict';

const CHILDREN = [
  { name: 'Generate Mahasiswa Aktif', code: 'PRODI_GENERATE_MAHASISWA_AKTIF_MANAGEMENT', path: '/mahasiswa/generate-aktif', icon: 'person_add' },
  { name: 'Mahasiswa Keluar', code: 'PRODI_MAHASISWA_KELUAR_MANAGEMENT', path: '/mahasiswa/keluar', icon: 'person_remove' },
  { name: 'Mahasiswa Cuti', code: 'PRODI_MAHASISWA_CUTI_MANAGEMENT', path: '/mahasiswa/cuti', icon: 'pause_circle' },
  { name: 'Habis Masa Studi', code: 'PRODI_HABIS_MASA_STUDI_MANAGEMENT', path: '/mahasiswa/habis-masa-studi', icon: 'event_busy' },
  { name: 'Monitoring FRS', code: 'PRODI_MONITORING_FRS_MANAGEMENT', path: '/mahasiswa/monitoring-frs', icon: 'fact_check' },
  { name: 'Biodata Mahasiswa', code: 'PRODI_BIODATA_MAHASISWA_MANAGEMENT', path: '/mahasiswa/biodata', icon: 'badge' },
];

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();

    await queryInterface.bulkInsert('menus', [
      {
        parent_id: null,
        name: 'Mahasiswa',
        code: 'PRODI_MAHASISWA_GROUP_MANAGEMENT',
        path: null,
        icon: 'school',
        order_number: 8,
        is_active: true,
        is_public: false,
        module: 'prodi',
        created_at: now,
        updated_at: now,
      },
    ]);

    const [rows] = await queryInterface.sequelize.query(
      "SELECT id FROM menus WHERE code = 'PRODI_MAHASISWA_GROUP_MANAGEMENT' LIMIT 1"
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
    await queryInterface.bulkDelete('menus', { code: ['PRODI_MAHASISWA_GROUP_MANAGEMENT'] });
  },
};
