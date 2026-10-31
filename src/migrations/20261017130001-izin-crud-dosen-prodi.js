'use strict';

// Menu Prodi → Dosen kini bisa tambah/ubah/hapus dosen homebase prodi: beri hak CRUD ke Superadmin
// & Prodi (role lain yang sudah punya akses tetap lihat saja).
const CODE = 'PRODI_DOSEN_MANAGEMENT';
const ROLES = ['SUPERADMIN', 'PRODI'];

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query(
      `UPDATE role_menu_permissions p
         JOIN menus m ON m.id = p.menu_id
         JOIN roles r ON r.id = p.role_id
          SET p.can_create = 1, p.can_update = 1, p.can_delete = 1, p.updated_at = NOW()
        WHERE m.code = :code AND r.code IN (:roles)`,
      { replacements: { code: CODE, roles: ROLES } }
    );
  },
  down: async (queryInterface) => {
    await queryInterface.sequelize.query(
      `UPDATE role_menu_permissions p
         JOIN menus m ON m.id = p.menu_id
         JOIN roles r ON r.id = p.role_id
          SET p.can_create = 0, p.can_update = 0, p.can_delete = 0, p.updated_at = NOW()
        WHERE m.code = :code AND r.code IN (:roles)`,
      { replacements: { code: CODE, roles: ROLES } }
    );
  },
};
