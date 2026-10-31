'use strict';

// Menu "Pertanyaan Angket Dosen" di grup Angket modul Prodi + 8 pertanyaan standar penilaian dosen
// untuk tahun ajaran aktif di tiap tingkat pendidikan (bisa diubah / disalin ke periode lain).
const MENU = { name: 'Pertanyaan Angket Dosen', code: 'PRODI_ANGKET_DOSEN_PERTANYAAN_MANAGEMENT', path: '/angket-dosen-pertanyaan', icon: 'rate_review' };
const ROLES = ['SUPERADMIN', 'ADMIN', 'PT', 'DIREKTUR', 'WADIR', 'PRODI'];
const PERTANYAAN = [
  'Kesungguhan dalam mempersiapkan perkuliahan (silabus, rencana mutu perkuliahan, rencana pelaksanaan perkuliahan)',
  'Keteraturan dan ketertiban penyelenggaraan perkuliahan (memenuhi jumlah tatap muka minimal dan penuhi waktu tatap muka)',
  'Kemampuan dalam menjelaskan materi perkuliahan',
  'Kedisiplinan dan kepatuhan terhadap aturan akademik',
  'Penguasaan/pemakaian media dan teknologi pembelajaran',
  'Objektivitas dalam penilaian terhadap mahasiswa',
  'Kemampuan membimbing dan memberikan tugas mahasiswa dengan baik',
  'Berpersepsi positif terhadap kemampuan mahasiswa',
];

const q = (queryInterface, sql, replacements) => queryInterface.sequelize.query(sql, { replacements }).then(([rows]) => rows);

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();
    const [existing] = await q(queryInterface, 'SELECT id FROM menus WHERE code = :code LIMIT 1', { code: MENU.code });
    if (!existing) {
      const [group] = await q(queryInterface, "SELECT id FROM menus WHERE code = 'PRODI_ANGKET_GROUP_MANAGEMENT' LIMIT 1");
      const parentId = group?.id ?? null;
      const [maxRow] = await q(
        queryInterface,
        parentId
          ? 'SELECT COALESCE(MAX(order_number), 0) m FROM menus WHERE parent_id = :parentId'
          : "SELECT COALESCE(MAX(order_number), 0) m FROM menus WHERE module = 'prodi' AND parent_id IS NULL",
        { parentId }
      );
      await queryInterface.bulkInsert('menus', [
        { parent_id: parentId, ...MENU, order_number: Number(maxRow.m) + 1, is_active: true, is_public: false, module: 'prodi', created_at: now, updated_at: now },
      ]);
      const [menu] = await q(queryInterface, 'SELECT id FROM menus WHERE code = :code LIMIT 1', { code: MENU.code });
      const roles = await q(queryInterface, 'SELECT id FROM roles WHERE code IN (:roles)', { roles: ROLES });
      if (roles.length) {
        await queryInterface.bulkInsert(
          'role_menu_permissions',
          roles.map((r) => ({ role_id: r.id, menu_id: menu.id, can_create: true, can_read: true, can_update: true, can_delete: true, created_at: now, updated_at: now }))
        );
      }
    }

    // Pertanyaan per periode akademik & tk. pendidikan: isi tahun ajaran aktif tiap jenjang yang masih kosong.
    const [ta] = await q(queryInterface, 'SELECT id FROM tahun_ajaran WHERE is_active = 1 ORDER BY id DESC LIMIT 1');
    if (!ta) return;
    const jenjangList = (await q(queryInterface, 'SELECT DISTINCT jenjang_pendidikan j FROM jurusan WHERE jenjang_pendidikan IS NOT NULL')).map((r) => r.j);
    for (const jenjang of jenjangList) {
      const [ada] = await q(queryInterface, 'SELECT id FROM angket_dosen_pertanyaan WHERE tahun_ajaran_id = :ta AND jenjang_pendidikan = :jenjang LIMIT 1', {
        ta: ta.id,
        jenjang,
      });
      if (ada) continue;
      await queryInterface.bulkInsert(
        'angket_dosen_pertanyaan',
        PERTANYAAN.map((pertanyaan, i) => ({
          tahun_ajaran_id: ta.id,
          jenjang_pendidikan: jenjang,
          pertanyaan,
          open_question: false,
          urutan: i + 1,
          created_at: now,
          updated_at: now,
        }))
      );
    }
  },
  down: async (queryInterface) => {
    const [menu] = await q(queryInterface, 'SELECT id FROM menus WHERE code = :code LIMIT 1', { code: MENU.code });
    if (!menu) return;
    await queryInterface.bulkDelete('role_menu_permissions', { menu_id: menu.id });
    await queryInterface.bulkDelete('menus', { id: menu.id });
  },
};
