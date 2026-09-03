'use strict';

const CHILDREN = [
  { name: 'Pembayaran Sertifikasi', code: 'KEUANGAN_PEMBAYARAN_SERTIFIKASI_MANAGEMENT', path: '/transaksi/pembayaran-sertifikasi', icon: 'workspace_premium' },
  { name: 'Voc Ujian', code: 'KEUANGAN_VOC_UJIAN_MANAGEMENT', path: '/transaksi/voc-ujian', icon: 'fact_check' },
  { name: 'Pembayaran SP', code: 'KEUANGAN_PEMBAYARAN_SP_MANAGEMENT', path: '/transaksi/pembayaran-sp', icon: 'report' },
  { name: 'Voc SP', code: 'KEUANGAN_VOC_SP_MANAGEMENT', path: '/transaksi/voc-sp', icon: 'fact_check' },
  { name: 'Pembayaran Kuliah', code: 'KEUANGAN_PEMBAYARAN_KULIAH_MANAGEMENT', path: '/transaksi/pembayaran-kuliah', icon: 'school' },
  { name: 'Pembayaran TA/Skripsi', code: 'KEUANGAN_PEMBAYARAN_TA_SKRIPSI_MANAGEMENT', path: '/transaksi/pembayaran-ta-skripsi', icon: 'assignment' },
  { name: 'Perpanjangan TA/Skripsi', code: 'KEUANGAN_PERPANJANGAN_TA_SKRIPSI_MANAGEMENT', path: '/transaksi/perpanjangan-ta-skripsi', icon: 'update' },
  { name: 'Tunggakan Mahasiswa', code: 'KEUANGAN_TUNGGAKAN_MAHASISWA_MANAGEMENT', path: '/transaksi/tunggakan-mahasiswa', icon: 'money_off' },
  { name: 'Pembayaran Wisuda', code: 'KEUANGAN_PEMBAYARAN_WISUDA_MANAGEMENT', path: '/transaksi/pembayaran-wisuda', icon: 'celebration' },
];

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();

    // Ganti menu leaf "Transaksi" lama (KEUANGAN_TRANSAKSI_MANAGEMENT) menjadi grup dengan
    // 9 sub-menu, mengikuti struktur sidebar sistem lama.
    const [oldMenus] = await queryInterface.sequelize.query(
      "SELECT id FROM menus WHERE code = 'KEUANGAN_TRANSAKSI_MANAGEMENT' LIMIT 1"
    );
    if (oldMenus.length) {
      await queryInterface.bulkDelete('role_menu_permissions', { menu_id: oldMenus[0].id });
      await queryInterface.bulkDelete('menus', { code: ['KEUANGAN_TRANSAKSI_MANAGEMENT'] });
    }

    await queryInterface.bulkInsert('menus', [
      {
        parent_id: null,
        name: 'Transaksi',
        code: 'KEUANGAN_TRANSAKSI_GROUP_MANAGEMENT',
        path: null,
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
      "SELECT id FROM menus WHERE code = 'KEUANGAN_TRANSAKSI_GROUP_MANAGEMENT' LIMIT 1"
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
    await queryInterface.bulkDelete('menus', { code: ['KEUANGAN_TRANSAKSI_GROUP_MANAGEMENT'] });
  },
};
