'use strict';

// Grup "Feeder Perkuliahan" di modul SIM, menggantikan menu placeholder "Feeder". Grup Feeder
// lain (Aktivitas, Evaluasi, Semester Antara) menyusul di urutan 5–7, jadi Panduan digeser ke 8–9.
const GROUP = { name: 'Feeder Perkuliahan', code: 'SIM_FEEDER_PERKULIAHAN_GROUP_MANAGEMENT', icon: 'cloud_upload', orderNumber: 4 };
const CHILDREN = [
  { name: 'Matakuliah', code: 'SIM_FEEDER_MATAKULIAH_MANAGEMENT', path: '/feeder/matakuliah', icon: 'menu_book' },
  { name: 'Mahasiswa', code: 'SIM_FEEDER_MAHASISWA_MANAGEMENT', path: '/feeder/mahasiswa', icon: 'school' },
  { name: 'Kelas', code: 'SIM_FEEDER_KELAS_MANAGEMENT', path: '/feeder/kelas', icon: 'meeting_room' },
  { name: 'KRS', code: 'SIM_FEEDER_KRS_MANAGEMENT', path: '/feeder/krs', icon: 'playlist_add_check' },
  { name: 'Dosen Ajar', code: 'SIM_FEEDER_DOSEN_AJAR_MANAGEMENT', path: '/feeder/dosen-ajar', icon: 'co_present' },
  { name: 'Nilai', code: 'SIM_FEEDER_NILAI_MANAGEMENT', path: '/feeder/nilai', icon: 'grading' },
  { name: 'AKM', code: 'SIM_FEEDER_AKM_MANAGEMENT', path: '/feeder/akm', icon: 'query_stats' },
  { name: 'Kelulusan', code: 'SIM_FEEDER_KELULUSAN_MANAGEMENT', path: '/feeder/kelulusan', icon: 'workspace_premium' },
  { name: 'Nilai Transfer', code: 'SIM_FEEDER_NILAI_TRANSFER_MANAGEMENT', path: '/feeder/nilai-transfer', icon: 'swap_horiz' },
];

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();
    const [existing] = await queryInterface.sequelize.query(`SELECT id FROM menus WHERE code = '${GROUP.code}' LIMIT 1`);
    if (existing.length) return;

    await queryInterface.bulkUpdate('menus', { is_active: false, updated_at: now }, { code: 'SIM_FEEDER_MANAGEMENT' });
    await queryInterface.bulkUpdate('menus', { order_number: 8, updated_at: now }, { code: 'SIM_PANDUAN_SMART_MANAGEMENT' });
    await queryInterface.bulkUpdate('menus', { order_number: 9, updated_at: now }, { code: 'SIM_PANDUAN_AKADEMIK_MANAGEMENT' });

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

    // Hak akses penuh untuk SUPERADMIN, sama seperti menu SIM lainnya.
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
    const now = new Date();
    const codes = [GROUP.code, ...CHILDREN.map((c) => c.code)];
    const [menus] = await queryInterface.sequelize.query(
      `SELECT id FROM menus WHERE code IN (${codes.map((c) => `'${c}'`).join(', ')})`
    );
    if (menus.length) await queryInterface.bulkDelete('role_menu_permissions', { menu_id: menus.map((m) => m.id) });
    await queryInterface.bulkDelete('menus', { code: CHILDREN.map((c) => c.code) });
    await queryInterface.bulkDelete('menus', { code: [GROUP.code] });
    await queryInterface.bulkUpdate('menus', { is_active: true, updated_at: now }, { code: 'SIM_FEEDER_MANAGEMENT' });
    await queryInterface.bulkUpdate('menus', { order_number: 5, updated_at: now }, { code: 'SIM_PANDUAN_SMART_MANAGEMENT' });
    await queryInterface.bulkUpdate('menus', { order_number: 6, updated_at: now }, { code: 'SIM_PANDUAN_AKADEMIK_MANAGEMENT' });
  },
};
