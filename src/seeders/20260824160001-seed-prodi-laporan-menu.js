'use strict';

const CHILDREN = [
  { name: 'Ijazah & Transkrip', code: 'PRODI_LAPORAN_IJAZAH_TRANSKRIP_MANAGEMENT', path: '/laporan/ijazah-transkrip', icon: 'workspace_premium' },
  { name: 'Cetak Surat', code: 'PRODI_LAPORAN_CETAK_SURAT_MANAGEMENT', path: '/laporan/cetak-surat', icon: 'description' },
  { name: 'Cetak Realisasi', code: 'PRODI_LAPORAN_CETAK_REALISASI_MANAGEMENT', path: '/laporan/cetak-realisasi', icon: 'fact_check' },
  { name: 'Cetak Mahasiswa Perkelas', code: 'PRODI_LAPORAN_CETAK_MAHASISWA_PERKELAS_MANAGEMENT', path: '/laporan/cetak-mahasiswa-perkelas', icon: 'groups' },
  { name: 'Cetak Kehadiran Mengajar', code: 'PRODI_LAPORAN_CETAK_KEHADIRAN_MENGAJAR_MANAGEMENT', path: '/laporan/cetak-kehadiran-mengajar', icon: 'event_available' },
  { name: 'Cetak KHS', code: 'PRODI_LAPORAN_CETAK_KHS_MANAGEMENT', path: '/laporan/cetak-khs', icon: 'summarize' },
];

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();

    await queryInterface.bulkInsert('menus', [
      {
        parent_id: null,
        name: 'Laporan',
        code: 'PRODI_LAPORAN_GROUP_MANAGEMENT',
        path: null,
        icon: 'summarize',
        order_number: 9,
        is_active: true,
        is_public: false,
        module: 'prodi',
        created_at: now,
        updated_at: now,
      },
    ]);

    const [rows] = await queryInterface.sequelize.query(
      "SELECT id FROM menus WHERE code = 'PRODI_LAPORAN_GROUP_MANAGEMENT' LIMIT 1"
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
    await queryInterface.bulkDelete('menus', { code: ['PRODI_LAPORAN_GROUP_MANAGEMENT'] });
  },
};
