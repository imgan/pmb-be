'use strict';

/**
 * Sidebar Prodi: "Angket Pelayanan" & "Pertanyaan Angket" digabung jadi satu grup "Angket" (pola
 * sama dengan grup Sidang/Bimbingan/dll.). Path & kode menu anak tidak berubah, jadi route & hak akses
 * halaman tetap; grup induk diberi hak baca ke role yang sudah punya akses ke salah satu anaknya.
 */
const GROUP = { name: 'Angket', code: 'PRODI_ANGKET_GROUP_MANAGEMENT', icon: 'reviews' };
const CHILDREN = ['PRODI_ANGKET_PELAYANAN_MANAGEMENT', 'PRODI_PERTANYAAN_ANGKET_MANAGEMENT'];

module.exports = {
  up: async (queryInterface) => {
    const q = (sql, replacements) => queryInterface.sequelize.query(sql, { replacements, type: queryInterface.sequelize.QueryTypes.SELECT });
    const children = await q("SELECT id, code, order_number FROM menus WHERE module = 'prodi' AND code IN (:codes)", { codes: CHILDREN });
    if (children.length !== CHILDREN.length) throw new Error('Menu Angket Pelayanan / Pertanyaan Angket prodi tidak ditemukan');
    const [existing] = await q('SELECT id FROM menus WHERE code = :code LIMIT 1', { code: GROUP.code });
    if (existing) return;

    const now = new Date();
    const order = Math.min(...children.map((c) => c.order_number));
    await queryInterface.bulkInsert('menus', [
      { parent_id: null, ...GROUP, path: null, order_number: order, is_active: true, is_public: false, module: 'prodi', created_at: now, updated_at: now },
    ]);
    const [group] = await q('SELECT id FROM menus WHERE code = :code LIMIT 1', { code: GROUP.code });

    for (const [i, code] of CHILDREN.entries()) {
      await queryInterface.sequelize.query('UPDATE menus SET parent_id = :parent, order_number = :order, updated_at = NOW() WHERE code = :code', {
        replacements: { parent: group.id, order: i + 1, code },
      });
    }
    // Satu slot top-level kini dipakai grup (dua menu lama keluar dari top-level): rapatkan urutan di belakangnya.
    await queryInterface.sequelize.query(
      "UPDATE menus SET order_number = order_number - 1, updated_at = NOW() WHERE module = 'prodi' AND parent_id IS NULL AND order_number > :order AND id <> :group",
      { replacements: { order: Math.max(...children.map((c) => c.order_number)), group: group.id } }
    );

    const roles = await q(
      'SELECT DISTINCT role_id FROM role_menu_permissions WHERE can_read = 1 AND menu_id IN (:ids)',
      { ids: children.map((c) => c.id) }
    );
    if (roles.length) {
      await queryInterface.bulkInsert(
        'role_menu_permissions',
        roles.map((r) => ({ role_id: r.role_id, menu_id: group.id, can_create: false, can_read: true, can_update: false, can_delete: false, created_at: now, updated_at: now }))
      );
    }
  },

  down: async (queryInterface) => {
    const q = (sql, replacements) => queryInterface.sequelize.query(sql, { replacements, type: queryInterface.sequelize.QueryTypes.SELECT });
    const [group] = await q('SELECT id, order_number FROM menus WHERE code = :code LIMIT 1', { code: GROUP.code });
    if (!group) return;
    await queryInterface.sequelize.query(
      "UPDATE menus SET order_number = order_number + 1, updated_at = NOW() WHERE module = 'prodi' AND parent_id IS NULL AND order_number > :order",
      { replacements: { order: group.order_number } }
    );
    for (const [i, code] of CHILDREN.entries()) {
      await queryInterface.sequelize.query('UPDATE menus SET parent_id = NULL, order_number = :order, updated_at = NOW() WHERE code = :code', {
        replacements: { order: group.order_number + i, code },
      });
    }
    await queryInterface.bulkDelete('role_menu_permissions', { menu_id: group.id });
    await queryInterface.bulkDelete('menus', { id: group.id });
  },
};
