'use strict';

const MASTER_CHILDREN = [
  { name: 'Keringanan', code: 'KEUANGAN_KERINGANAN_MANAGEMENT', path: '/master/keringanan', icon: 'volunteer_activism' },
  { name: 'Tarif TA/Skripsi', code: 'KEUANGAN_TARIF_TA_SKRIPSI_MANAGEMENT', path: '/master/tarif-ta-skripsi', icon: 'assignment' },
  { name: 'Tarif Pembimbing', code: 'KEUANGAN_TARIF_PEMBIMBING_MANAGEMENT', path: '/master/tarif-pembimbing', icon: 'supervisor_account' },
  { name: 'Tarif Biaya Lain', code: 'KEUANGAN_TARIF_BIAYA_LAIN_MANAGEMENT', path: '/master/tarif-biaya-lain', icon: 'payments' },
  { name: 'Tarif Biaya Kuliah', code: 'KEUANGAN_TARIF_BIAYA_KULIAH_MANAGEMENT', path: '/master/tarif-biaya-kuliah', icon: 'school' },
  { name: 'Generate Tagihan', code: 'KEUANGAN_GENERATE_TAGIHAN_MANAGEMENT', path: '/master/generate-tagihan', icon: 'receipt_long' },
  { name: 'Daftar Potongan', code: 'KEUANGAN_DAFTAR_POTONGAN_MANAGEMENT', path: '/master/daftar-potongan', icon: 'percent' },
];

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();

    await queryInterface.bulkInsert('menus', [
      {
        parent_id: null,
        name: 'Dashboard',
        code: 'KEUANGAN_DASHBOARD',
        path: '/dashboard',
        icon: 'dashboard',
        order_number: 1,
        is_active: true,
        is_public: false,
        module: 'keuangan',
        created_at: now,
        updated_at: now,
      },
      {
        parent_id: null,
        name: 'Master',
        code: 'KEUANGAN_MASTER_GROUP_MANAGEMENT',
        path: null,
        icon: 'layers',
        order_number: 2,
        is_active: true,
        is_public: false,
        module: 'keuangan',
        created_at: now,
        updated_at: now,
      },
      {
        parent_id: null,
        name: 'Transaksi',
        code: 'KEUANGAN_TRANSAKSI_MANAGEMENT',
        path: '/transaksi',
        icon: 'swap_horiz',
        order_number: 3,
        is_active: true,
        is_public: false,
        module: 'keuangan',
        created_at: now,
        updated_at: now,
      },
    ]);

    const [rows] = await queryInterface.sequelize.query(
      "SELECT id FROM menus WHERE code = 'KEUANGAN_MASTER_GROUP_MANAGEMENT' LIMIT 1"
    );
    const groupId = rows[0].id;

    await queryInterface.bulkInsert(
      'menus',
      MASTER_CHILDREN.map((child, index) => ({
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
    await queryInterface.bulkDelete('menus', { code: MASTER_CHILDREN.map((c) => c.code) });
    await queryInterface.bulkDelete('menus', {
      code: ['KEUANGAN_DASHBOARD', 'KEUANGAN_MASTER_GROUP_MANAGEMENT', 'KEUANGAN_TRANSAKSI_MANAGEMENT'],
    });
  },
};
