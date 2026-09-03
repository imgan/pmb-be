'use strict';

const MASTER_CHILDREN = [
  { name: 'Student Body', code: 'SIM_STUDENT_BODY_MANAGEMENT', path: '/master/student-body', icon: 'groups' },
  { name: 'Presentase Kehadiran', code: 'SIM_PRESENTASE_KEHADIRAN_MANAGEMENT', path: '/master/presentase-kehadiran', icon: 'event_available' },
  { name: 'Kehadiran Kelas', code: 'SIM_KEHADIRAN_KELAS_MANAGEMENT', path: '/master/kehadiran-kelas', icon: 'meeting_room' },
  { name: 'FRS', code: 'SIM_FRS_MANAGEMENT', path: '/master/frs', icon: 'assignment' },
  { name: 'Ujian', code: 'SIM_UJIAN_MANAGEMENT', path: '/master/ujian', icon: 'fact_check' },
  { name: 'Aktif', code: 'SIM_AKTIF_MANAGEMENT', path: '/master/aktif', icon: 'how_to_reg' },
  { name: 'IPK', code: 'SIM_IPK_MANAGEMENT', path: '/master/ipk', icon: 'insights' },
  { name: 'Lulusan', code: 'SIM_LULUSAN_MANAGEMENT', path: '/master/lulusan', icon: 'school' },
  { name: 'Nilai D & E', code: 'SIM_NILAI_D_E_MANAGEMENT', path: '/master/nilai-d-e', icon: 'grade' },
];

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();

    await queryInterface.bulkInsert('menus', [
      {
        parent_id: null,
        name: 'Dashboard',
        code: 'SIM_DASHBOARD',
        path: '/dashboard',
        icon: 'dashboard',
        order_number: 1,
        is_active: true,
        is_public: false,
        module: 'sim',
        created_at: now,
        updated_at: now,
      },
      {
        parent_id: null,
        name: 'Master',
        code: 'SIM_MASTER_GROUP_MANAGEMENT',
        path: null,
        icon: 'layers',
        order_number: 2,
        is_active: true,
        is_public: false,
        module: 'sim',
        created_at: now,
        updated_at: now,
      },
      {
        parent_id: null,
        name: 'Transaksi',
        code: 'SIM_TRANSAKSI_MANAGEMENT',
        path: '/transaksi',
        icon: 'swap_horiz',
        order_number: 3,
        is_active: true,
        is_public: false,
        module: 'sim',
        created_at: now,
        updated_at: now,
      },
      {
        parent_id: null,
        name: 'Feeder',
        code: 'SIM_FEEDER_MANAGEMENT',
        path: '/feeder',
        icon: 'menu_book',
        order_number: 4,
        is_active: true,
        is_public: false,
        module: 'sim',
        created_at: now,
        updated_at: now,
      },
      {
        parent_id: null,
        name: 'Panduan SMART',
        code: 'SIM_PANDUAN_SMART_MANAGEMENT',
        path: '/panduan-smart',
        icon: 'notifications',
        order_number: 5,
        is_active: true,
        is_public: false,
        module: 'sim',
        created_at: now,
        updated_at: now,
      },
      {
        parent_id: null,
        name: 'Panduan Akademik',
        code: 'SIM_PANDUAN_AKADEMIK_MANAGEMENT',
        path: '/panduan-akademik',
        icon: 'notifications',
        order_number: 6,
        is_active: true,
        is_public: false,
        module: 'sim',
        created_at: now,
        updated_at: now,
      },
    ]);

    const [rows] = await queryInterface.sequelize.query(
      "SELECT id FROM menus WHERE code = 'SIM_MASTER_GROUP_MANAGEMENT' LIMIT 1"
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
        module: 'sim',
        created_at: now,
        updated_at: now,
      }))
    );
  },
  down: async (queryInterface) => {
    await queryInterface.bulkDelete('menus', { code: MASTER_CHILDREN.map((c) => c.code) });
    await queryInterface.bulkDelete('menus', {
      code: [
        'SIM_DASHBOARD',
        'SIM_MASTER_GROUP_MANAGEMENT',
        'SIM_TRANSAKSI_MANAGEMENT',
        'SIM_FEEDER_MANAGEMENT',
        'SIM_PANDUAN_SMART_MANAGEMENT',
        'SIM_PANDUAN_AKADEMIK_MANAGEMENT',
      ],
    });
  },
};
