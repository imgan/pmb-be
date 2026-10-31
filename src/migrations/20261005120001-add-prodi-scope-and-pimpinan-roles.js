'use strict';

/**
 * Konteks login modul Prodi:
 * - users.kode_prodi: prodi yang dipegang akun ber-role PRODI (Kaprodi/staf prodi). Prodi diwakili
 *   kode prodi karena tabel jurusan punya beberapa baris per prodi (per golongan kelas).
 * - Role DIREKTUR & WADIR (hak akses disalin dari PT): bersama ADMIN/SUPERADMIN/PT boleh memilih
 *   "Semua Prodi" saat login modul Prodi.
 * - Data awal: Direktur & Wadir dipindah dari role PT; Kaprodi dihubungkan ke prodinya
 *   berdasarkan jabatan di data karyawan.
 */
const NEW_ROLES = [
  { code: 'DIREKTUR', name: 'Direktur' },
  { code: 'WADIR', name: 'Wakil Direktur' },
];
const ROLE_BY_USERNAME = { 2107029: 'DIREKTUR', 2510049: 'WADIR', 2212037: 'WADIR' };
const PRODI_BY_USERNAME = {
  2111031: '48401', // Kaprodi D-III Farmasi
  2212038: '90346', // Kaprodi D-IV TRM
  2307042: '13461', // Kaprodi D-III Adm. Rumah Sakit
  2407047: '63414', // Kaprodi D-III Manajemen Logistik
  2309041: '48401', // Kepala Unit Laboratorium (Farmasi)
};

module.exports = {
  up: async (queryInterface) => {
    const q = (sql, replacements) => queryInterface.sequelize.query(sql, { replacements }).then(([rows]) => rows);
    await q('ALTER TABLE users ADD COLUMN kode_prodi VARCHAR(20) NULL AFTER role_id');

    const [pt] = await q("SELECT id FROM roles WHERE code = 'PT' LIMIT 1");
    for (const role of NEW_ROLES) {
      const [existing] = await q('SELECT id FROM roles WHERE code = :code', { code: role.code });
      if (existing) continue;
      await q('INSERT INTO roles (code, name, created_at, updated_at) VALUES (:code, :name, NOW(), NOW())', role);
      const [created] = await q('SELECT id FROM roles WHERE code = :code', { code: role.code });
      if (pt) {
        await q(
          `INSERT INTO role_menu_permissions (role_id, menu_id, can_create, can_read, can_update, can_delete, created_at, updated_at)
           SELECT :roleId, menu_id, can_create, can_read, can_update, can_delete, NOW(), NOW()
             FROM role_menu_permissions WHERE role_id = :ptId`,
          { roleId: created.id, ptId: pt.id }
        );
      }
    }

    for (const [username, code] of Object.entries(ROLE_BY_USERNAME)) {
      await q('UPDATE users u JOIN roles r ON r.code = :code SET u.role_id = r.id WHERE u.username = :username', {
        code,
        username,
      });
    }
    for (const [username, kodeProdi] of Object.entries(PRODI_BY_USERNAME)) {
      await q('UPDATE users SET kode_prodi = :kodeProdi WHERE username = :username', { kodeProdi, username });
    }
  },

  down: async (queryInterface) => {
    const q = (sql, replacements) => queryInterface.sequelize.query(sql, { replacements }).then(([rows]) => rows);
    await q(
      "UPDATE users u JOIN roles r ON r.id = u.role_id JOIN roles pt ON pt.code = 'PT' SET u.role_id = pt.id WHERE r.code IN ('DIREKTUR', 'WADIR')"
    );
    await q(
      "DELETE p FROM role_menu_permissions p JOIN roles r ON r.id = p.role_id WHERE r.code IN ('DIREKTUR', 'WADIR')"
    );
    await q("DELETE FROM roles WHERE code IN ('DIREKTUR', 'WADIR')");
    await q('ALTER TABLE users DROP COLUMN kode_prodi');
  },
};
