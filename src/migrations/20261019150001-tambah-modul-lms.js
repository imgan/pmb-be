'use strict';

/**
 * Modul staff baru "LMS" (Learning Management System, /lms): tambah 'lms' ke enum menus.module dan menu
 * sidebar-nya. Hak akses penuh diberikan ke SUPERADMIN (role lain diatur lewat Role & Permission).
 */
const MENUS = [
  { name: 'Dashboard', code: 'LMS_DASHBOARD', path: '/dashboard', icon: 'dashboard' },
  { name: 'Kelas Online', code: 'LMS_KELAS_MANAGEMENT', path: '/kelas', icon: 'cast_for_education' },
  { name: 'Materi Pembelajaran', code: 'LMS_MATERI_MANAGEMENT', path: '/materi', icon: 'library_books' },
  { name: 'Tugas', code: 'LMS_TUGAS_MANAGEMENT', path: '/tugas', icon: 'assignment' },
  { name: 'Kuis & Ujian', code: 'LMS_KUIS_MANAGEMENT', path: '/kuis', icon: 'quiz' },
  { name: 'Forum Diskusi', code: 'LMS_FORUM_MANAGEMENT', path: '/forum', icon: 'forum' },
  { name: 'Pengumuman', code: 'LMS_PENGUMUMAN_MANAGEMENT', path: '/pengumuman', icon: 'campaign' },
  { name: 'Laporan Aktivitas', code: 'LMS_LAPORAN_MANAGEMENT', path: '/laporan', icon: 'insights' },
];
const ENUM_LAMA = ['pmb', 'baak', 'sdi', 'prodi', 'keuangan', 'sim', 'admin'];

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('menus', 'module', { type: Sequelize.ENUM(...ENUM_LAMA, 'lms'), allowNull: false, defaultValue: 'pmb' });

    const q = (sql, replacements) => queryInterface.sequelize.query(sql, { replacements, type: queryInterface.sequelize.QueryTypes.SELECT });
    const [ada] = await q('SELECT id FROM menus WHERE code = :code LIMIT 1', { code: MENUS[0].code });
    if (ada) return;

    const now = new Date();
    await queryInterface.bulkInsert(
      'menus',
      MENUS.map((m, i) => ({ parent_id: null, ...m, order_number: i + 1, is_active: true, is_public: false, module: 'lms', created_at: now, updated_at: now }))
    );
    const [role] = await q("SELECT id FROM roles WHERE code = 'SUPERADMIN' LIMIT 1");
    if (!role) return;
    const menus = await q('SELECT id FROM menus WHERE code IN (:codes)', { codes: MENUS.map((m) => m.code) });
    await queryInterface.bulkInsert(
      'role_menu_permissions',
      menus.map((m) => ({ role_id: role.id, menu_id: m.id, can_create: true, can_read: true, can_update: true, can_delete: true, created_at: now, updated_at: now }))
    );
  },

  down: async (queryInterface, Sequelize) => {
    const q = (sql, replacements) => queryInterface.sequelize.query(sql, { replacements, type: queryInterface.sequelize.QueryTypes.SELECT });
    const menus = await q("SELECT id FROM menus WHERE module = 'lms'");
    if (menus.length) {
      const ids = menus.map((m) => m.id);
      await queryInterface.bulkDelete('role_menu_permissions', { menu_id: ids });
      await queryInterface.bulkDelete('menus', { id: ids });
    }
    await queryInterface.changeColumn('menus', 'module', { type: Sequelize.ENUM(...ENUM_LAMA), allowNull: false, defaultValue: 'pmb' });
  },
};
