'use strict';

const GROUP = { name: 'Feeder Aktivitas', code: 'SIM_FEEDER_AKTIVITAS_GROUP_MANAGEMENT', icon: 'diversity_3', orderNumber: 5 };
const CHILDREN = [
  { name: 'Aktivitas Mahasiswa Bimbingan', code: 'SIM_FEEDER_AKTIVITAS_TA_MANAGEMENT', path: '/feeder/aktivitas-ta', icon: 'assignment' },
  { name: 'Peserta Aktivitas', code: 'SIM_FEEDER_PESERTA_TA_MANAGEMENT', path: '/feeder/peserta-ta', icon: 'group' },
  { name: 'Dosen Pembimbing', code: 'SIM_FEEDER_PEMBIMBING_TA_MANAGEMENT', path: '/feeder/pembimbing-ta', icon: 'supervisor_account' },
  { name: 'Dosen Penguji', code: 'SIM_FEEDER_PENGUJI_TA_MANAGEMENT', path: '/feeder/penguji-ta', icon: 'gavel' },
  { name: 'Aktivitas Mahasiswa KKP', code: 'SIM_FEEDER_AKTIVITAS_KKP_MANAGEMENT', path: '/feeder/aktivitas-kkp', icon: 'work' },
  { name: 'Peserta Aktivitas KKP', code: 'SIM_FEEDER_PESERTA_KKP_MANAGEMENT', path: '/feeder/peserta-kkp', icon: 'group' },
  { name: 'Dosen Pembimbing KKP', code: 'SIM_FEEDER_PEMBIMBING_KKP_MANAGEMENT', path: '/feeder/pembimbing-kkp', icon: 'supervisor_account' },
  { name: 'Aktivitas Mahasiswa PA', code: 'SIM_FEEDER_AKTIVITAS_PA_MANAGEMENT', path: '/feeder/aktivitas-pa', icon: 'psychology' },
  { name: 'Peserta Aktivitas PA', code: 'SIM_FEEDER_PESERTA_PA_MANAGEMENT', path: '/feeder/peserta-pa', icon: 'group' },
  { name: 'Dosen Pembimbing PA', code: 'SIM_FEEDER_PEMBIMBING_PA_MANAGEMENT', path: '/feeder/pembimbing-pa', icon: 'supervisor_account' },
];

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();
    const [existing] = await queryInterface.sequelize.query(`SELECT id FROM menus WHERE code = '${GROUP.code}' LIMIT 1`);
    if (existing.length) return;

    await queryInterface.bulkInsert('menus', [
      {
        parent_id: null,
        name: GROUP.name,
        code: GROUP.code,
        path: null,
        icon: GROUP.icon,
        order_number: GROUP.orderNumber,
        is_active: true,
        is_public: false,
        module: 'sim',
        created_at: now,
        updated_at: now,
      },
    ]);
    const [rows] = await queryInterface.sequelize.query(`SELECT id FROM menus WHERE code = '${GROUP.code}' LIMIT 1`);
    await queryInterface.bulkInsert(
      'menus',
      CHILDREN.map((c, i) => ({
        parent_id: rows[0].id,
        name: c.name,
        code: c.code,
        path: c.path,
        icon: c.icon,
        order_number: i + 1,
        is_active: true,
        is_public: false,
        module: 'sim',
        created_at: now,
        updated_at: now,
      }))
    );

    const [roles] = await queryInterface.sequelize.query("SELECT id FROM roles WHERE code = 'SUPERADMIN' LIMIT 1");
    const codes = [GROUP.code, ...CHILDREN.map((c) => c.code)];
    const [menus] = await queryInterface.sequelize.query(
      `SELECT id FROM menus WHERE code IN (${codes.map((c) => `'${c}'`).join(', ')})`
    );
    await queryInterface.bulkInsert(
      'role_menu_permissions',
      menus.map((m) => ({
        role_id: roles[0].id,
        menu_id: m.id,
        can_create: true,
        can_read: true,
        can_update: true,
        can_delete: true,
        created_at: now,
        updated_at: now,
      }))
    );
  },
  down: async (queryInterface) => {
    const codes = [GROUP.code, ...CHILDREN.map((c) => c.code)];
    const [menus] = await queryInterface.sequelize.query(
      `SELECT id FROM menus WHERE code IN (${codes.map((c) => `'${c}'`).join(', ')})`
    );
    if (menus.length) await queryInterface.bulkDelete('role_menu_permissions', { menu_id: menus.map((m) => m.id) });
    await queryInterface.bulkDelete('menus', { code: CHILDREN.map((c) => c.code) });
    await queryInterface.bulkDelete('menus', { code: [GROUP.code] });
  },
};
