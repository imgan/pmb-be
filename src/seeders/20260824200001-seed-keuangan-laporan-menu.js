'use strict';

const CHILDREN = [
  { name: 'Tunggakan Mahasiswa', code: 'KEUANGAN_LAPORAN_TUNGGAKAN_MAHASISWA_MANAGEMENT', path: '/laporan/tunggakan-mahasiswa', icon: 'money_off' },
  { name: 'Laporan Uang Kuliah', code: 'KEUANGAN_LAPORAN_UANG_KULIAH_MANAGEMENT', path: '/laporan/uang-kuliah', icon: 'payments' },
  { name: 'Laporan Lain', code: 'KEUANGAN_LAPORAN_LAIN_MANAGEMENT', path: '/laporan/lain', icon: 'description' },
  { name: 'Laporan Bebas Tunggakan', code: 'KEUANGAN_LAPORAN_BEBAS_TUNGGAKAN_MANAGEMENT', path: '/laporan/bebas-tunggakan', icon: 'verified' },
  { name: 'Laporan Tunggakan', code: 'KEUANGAN_LAPORAN_TUNGGAKAN_MANAGEMENT', path: '/laporan/tunggakan', icon: 'report' },
  { name: 'Laporan Sertifikasi', code: 'KEUANGAN_LAPORAN_SERTIFIKASI_MANAGEMENT', path: '/laporan/sertifikasi', icon: 'workspace_premium' },
  { name: 'Laporan KTI/Skripsi', code: 'KEUANGAN_LAPORAN_KTI_SKRIPSI_MANAGEMENT', path: '/laporan/kti-skripsi', icon: 'menu_book' },
  { name: 'Laporan Semester Pendek', code: 'KEUANGAN_LAPORAN_SEMESTER_PENDEK_MANAGEMENT', path: '/laporan/semester-pendek', icon: 'event' },
];

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();

    await queryInterface.bulkInsert('menus', [
      {
        parent_id: null,
        name: 'Laporan',
        code: 'KEUANGAN_LAPORAN_GROUP_MANAGEMENT',
        path: null,
        icon: 'summarize',
        order_number: 4,
        is_active: true,
        is_public: false,
        module: 'keuangan',
        created_at: now,
        updated_at: now,
      },
    ]);

    const [rows] = await queryInterface.sequelize.query(
      "SELECT id FROM menus WHERE code = 'KEUANGAN_LAPORAN_GROUP_MANAGEMENT' LIMIT 1"
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
        module: 'keuangan',
        created_at: now,
        updated_at: now,
      }))
    );
  },
  down: async (queryInterface) => {
    await queryInterface.bulkDelete('menus', { code: CHILDREN.map((c) => c.code) });
    await queryInterface.bulkDelete('menus', { code: ['KEUANGAN_LAPORAN_GROUP_MANAGEMENT'] });
  },
};
