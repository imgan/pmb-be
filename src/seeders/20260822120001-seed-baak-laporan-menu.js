'use strict';

const CHILDREN = [
  { name: 'Ijazah & Transkrip', code: 'LAPORAN_IJAZAH_TRANSKRIP_MANAGEMENT', path: '/laporan/ijazah-transkrip', icon: 'verified', orderNumber: 1 },
  { name: 'Cetak Surat', code: 'LAPORAN_CETAK_SURAT_MANAGEMENT', path: '/laporan/cetak-surat', icon: 'mail', orderNumber: 2 },
  { name: 'Cetak Realisasi', code: 'LAPORAN_CETAK_REALISASI_MANAGEMENT', path: '/laporan/cetak-realisasi', icon: 'receipt_long', orderNumber: 3 },
  { name: 'Cetak Mahasiswa Perkelas', code: 'LAPORAN_CETAK_MAHASISWA_PERKELAS_MANAGEMENT', path: '/laporan/cetak-mahasiswa-perkelas', icon: 'groups', orderNumber: 4 },
  { name: 'Cetak Kehadiran Mengajar', code: 'LAPORAN_CETAK_KEHADIRAN_MENGAJAR_MANAGEMENT', path: '/laporan/cetak-kehadiran-mengajar', icon: 'event_available', orderNumber: 5 },
  { name: 'Cetak KHS', code: 'LAPORAN_CETAK_KHS_MANAGEMENT', path: '/laporan/cetak-khs', icon: 'assignment', orderNumber: 6 },
];

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();

    await queryInterface.bulkInsert('menus', [
      {
        parent_id: null,
        name: 'Laporan',
        code: 'BAAK_LAPORAN_MANAGEMENT',
        path: null,
        icon: 'summarize',
        order_number: 9,
        is_active: true,
        is_public: false,
        module: 'baak',
        created_at: now,
        updated_at: now,
      },
    ]);

    // Geser ReadMe ke urutan paling akhir agar berada di bawah grup Laporan.
    await queryInterface.bulkUpdate('menus', { order_number: 10, updated_at: now }, { code: 'BAAK_README_MANAGEMENT' });

    const [rows] = await queryInterface.sequelize.query("SELECT id FROM menus WHERE code = 'BAAK_LAPORAN_MANAGEMENT' LIMIT 1");
    const laporanGroupId = rows[0].id;

    await queryInterface.bulkInsert(
      'menus',
      CHILDREN.map((child) => ({
        parent_id: laporanGroupId,
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
    const now = new Date();
    await queryInterface.bulkDelete('menus', { code: CHILDREN.map((child) => child.code) });
    await queryInterface.bulkDelete('menus', { code: ['BAAK_LAPORAN_MANAGEMENT'] });
    await queryInterface.bulkUpdate('menus', { order_number: 9, updated_at: now }, { code: 'BAAK_README_MANAGEMENT' });
  },
};
