'use strict';

// User Management & Role Management (dari modul PMB) serta Tahun Ajaran (dari modul BAAK) pindah ke
// Modul Admin. Hak akses tetap per kode menu, jadi role_permissions tidak perlu diubah.
const PINDAH = [
  { code: 'USER_MANAGEMENT', order: 2 },
  { code: 'ROLE_MANAGEMENT', order: 3 },
  { code: 'TAHUN_AJARAN_MANAGEMENT', order: 4 },
];

const rapikanUrutan = async (queryInterface, module) => {
  const [rows] = await queryInterface.sequelize.query(
    'SELECT id FROM menus WHERE module = :module AND parent_id IS NULL AND is_public = false ORDER BY order_number, id',
    { replacements: { module } }
  );
  for (const [i, row] of rows.entries()) {
    await queryInterface.sequelize.query('UPDATE menus SET order_number = :order WHERE id = :id', {
      replacements: { order: i + 1, id: row.id },
    });
  }
};

module.exports = {
  up: async (queryInterface) => {
    const asal = new Set();
    for (const { code, order } of PINDAH) {
      const [[menu]] = await queryInterface.sequelize.query('SELECT id, module FROM menus WHERE code = :code LIMIT 1', {
        replacements: { code },
      });
      if (!menu || menu.module === 'admin') continue;
      asal.add(menu.module);
      await queryInterface.sequelize.query(
        "UPDATE menus SET module = 'admin', parent_id = NULL, order_number = :order, updated_at = NOW() WHERE id = :id",
        { replacements: { order, id: menu.id } }
      );
    }
    for (const module of asal) await rapikanUrutan(queryInterface, module);
  },
  down: async (queryInterface) => {
    const kembali = { USER_MANAGEMENT: 'pmb', ROLE_MANAGEMENT: 'pmb', TAHUN_AJARAN_MANAGEMENT: 'baak' };
    for (const [code, module] of Object.entries(kembali)) {
      await queryInterface.sequelize.query(
        'UPDATE menus SET module = :module, order_number = 999, updated_at = NOW() WHERE code = :code',
        { replacements: { module, code } }
      );
    }
    await rapikanUrutan(queryInterface, 'pmb');
    await rapikanUrutan(queryInterface, 'baak');
  },
};
