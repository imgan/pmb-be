'use strict';

// Modul staff baru "Admin" (/modul-admin) — menu Impersonasi Akun dipindah dari modul PMB ke sini.
const IMPERSONASI = 'IMPERSONASI_MANAGEMENT';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('menus', 'module', {
      type: Sequelize.ENUM('pmb', 'baak', 'sdi', 'prodi', 'keuangan', 'sim', 'admin'),
      allowNull: false,
      defaultValue: 'pmb',
    });
    const [[menu]] = await queryInterface.sequelize.query("SELECT id, order_number, module FROM menus WHERE code = :code LIMIT 1", {
      replacements: { code: IMPERSONASI },
    });
    if (menu && menu.module === 'pmb') {
      await queryInterface.sequelize.query("UPDATE menus SET module = 'admin', order_number = 1, updated_at = NOW() WHERE id = :id", {
        replacements: { id: menu.id },
      });
      await queryInterface.sequelize.query(
        "UPDATE menus SET order_number = order_number - 1, updated_at = NOW() WHERE module = 'pmb' AND parent_id IS NULL AND is_public = false AND order_number > :order",
        { replacements: { order: menu.order_number } }
      );
    }
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query("UPDATE menus SET module = 'pmb', updated_at = NOW() WHERE module = 'admin'");
    await queryInterface.changeColumn('menus', 'module', {
      type: Sequelize.ENUM('pmb', 'baak', 'sdi', 'prodi', 'keuangan', 'sim'),
      allowNull: false,
      defaultValue: 'pmb',
    });
  },
};
