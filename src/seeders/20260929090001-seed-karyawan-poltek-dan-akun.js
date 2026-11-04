'use strict';

const bcrypt = require('bcryptjs');

/**
 * Data karyawan Politeknik Bhakti Kartini + akun login staf.
 *  - Username = NIP. Bila email kosong, email akun diisi alamat sementara
 *    "<nip>@poltekbhaktikartini.ac.id" (kolom users.email wajib & unik). Email di tabel karyawan
 *    tetap kosong untuk mereka.
 *  - Password awal = NIP.
 *  - Role per modul di bawah ini masih DUMMY (ditetapkan dari jabatan); sesuaikan lewat menu Role.
 * Idempotent: karyawan/user/role yang sudah ada (berdasarkan NIP/username/kode) dilewati.
 */
const EMAIL_DOMAIN = 'poltekbhaktikartini.ac.id';

// Role dummy per modul: PT = semua modul.
const ROLES = [
  { code: 'PT', name: 'Pimpinan / PT', modules: ['pmb', 'baak', 'sdi', 'prodi', 'keuangan', 'sim'] },
  { code: 'PMB', name: 'Staf PMB', modules: ['pmb'] },
  { code: 'BAAK', name: 'Staf BAAK', modules: ['baak'] },
  { code: 'PRODI', name: 'Staf Prodi', modules: ['prodi'] },
  { code: 'KEUANGAN', name: 'Staf Keuangan', modules: ['keuangan'] },
  { code: 'SDI', name: 'Staf SDI', modules: ['sdi'] },
  { code: 'SIM', name: 'Staf SIM', modules: ['sim'] },
];

const KARYAWAN = [
  { nip: '2107029', nama: 'Yusnita Yusfik, S.KM., M.KM', jabatan: 'Direktur', email: 'yusnita.yusfik@poltekbhaktikartini.ac.id', role: 'PT' },
  { nip: '2510049', nama: 'Hafiz Fauzi, S.Sn., M.Pd', jabatan: 'Wakil Direktur I & Ka. LPMI', email: null, role: 'PT' },
  { nip: '2212037', nama: 'Wawan Hermawansyah, S.Kom., M.S.S.I', jabatan: 'Wakil Direktur II', email: 'wawan.hermawansyah@poltekbhaktikartini.ac.id', role: 'PT' },
  { nip: '2111031', nama: 'apt. Ayu Fajariyani, M.Farm', jabatan: 'Kaprodi D-III Farmasi', email: 'ayu.fajariyani@poltekbhaktikartini.ac.id', role: 'PRODI' },
  { nip: '2212038', nama: 'Rahman Abdillah, M.Tech', jabatan: 'Kaprodi D-IV TRM', email: null, role: 'PRODI' },
  { nip: '2307042', nama: 'Kurniati Nawangwulan, S.KM., M.Kes', jabatan: 'Kaprodi D-III Adm. Rumah Sakit', email: 'kurniati.nawangwulan@poltekbhaktikartini.ac.id', role: 'PRODI' },
  { nip: '2407047', nama: 'Lantip Handoyo Susilo, S.E., M.M.', jabatan: 'Kaprodi D-III Manajemen Logistik', email: 'lantip.hs@poltekbhaktikartini.ac.id', role: 'PRODI' },
  { nip: '2607050', nama: 'Rismalinda, S.STR., M.Kes', jabatan: 'Ka. LPPM', email: 'lppm@poltekbhaktikartini.ac.id', role: 'SIM' },
  { nip: '2309041', nama: 'apt. Neni Rahmani, S.Farm., M.Farm', jabatan: 'Kepala Unit Laboratorium', email: 'neni.rahmani@poltekbhaktikartini.ac.id', role: 'PRODI' },
  { nip: '1805007', nama: 'Dyah Suryati Angreni, S.S', jabatan: 'Sekretaris BOD/Ka. Unit Kepegawaian', email: 'admin@poltekbhaktikartini.ac.id', role: 'PT' },
  { nip: '2106027', nama: 'Farah Emiryl Khalifah, S.Par', jabatan: 'Ka. Unit BAAK', email: 'baak@poltekbhaktikartini.ac.id', role: 'BAAK' },
  { nip: '2303040', nama: 'Muhamad Ii Hariri', jabatan: 'Staff Akunting', email: 'keuangan@poltekbhaktikartini.ac.id', role: 'KEUANGAN' },
  { nip: '2301039', nama: 'Rizki Radifan Julistio, S.Pd., M.Pd', jabatan: 'Content Creator', email: null, role: 'PMB' },
  { nip: '2402046', nama: 'Nur Alam, S.I.Kom., M.I.Kom', jabatan: 'Ka. Biro Marketing', email: 'marketing@poltekbhaktikartini.ac.id', role: 'PMB' },
  { nip: '1708004', nama: 'Suni Ali Fauzi, S.Kom', jabatan: 'Staff Sarana Prasarana', email: 'sarpras@poltekbhaktikartini.ac.id', role: 'SDI' },
  { nip: '2103019', nama: 'Retno Puji Rusyati, A.md.S.I.Ak', jabatan: 'Staff LPPM & LPMI', email: null, role: 'SIM' },
  { nip: '2103021', nama: 'Silvia Rahmayanti', jabatan: 'Staff Marketing / PMB', email: null, role: 'PMB' },
  { nip: '2507048', nama: 'Meidina Rahmawati', jabatan: 'Staff BAAK', email: null, role: 'BAAK' },
];

const q = (queryInterface, sql, replacements) => queryInterface.sequelize.query(sql, { replacements }).then(([rows]) => rows);

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();

    // ---- Role per modul + hak akses penuh ke semua menu modulnya ----
    const roleIds = {};
    for (const role of ROLES) {
      let [row] = await q(queryInterface, 'SELECT id FROM roles WHERE code = :code LIMIT 1', { code: role.code });
      if (!row) {
        await queryInterface.bulkInsert('roles', [
          { name: role.name, code: role.code, description: 'Role dummy per modul', is_active: true, created_at: now, updated_at: now },
        ]);
        [row] = await q(queryInterface, 'SELECT id FROM roles WHERE code = :code LIMIT 1', { code: role.code });
        const menus = await q(queryInterface, 'SELECT id FROM menus WHERE module IN (:modules)', { modules: role.modules });
        if (menus.length) {
          await queryInterface.bulkInsert(
            'role_menu_permissions',
            menus.map((m) => ({
              role_id: row.id,
              menu_id: m.id,
              can_create: true,
              can_read: true,
              can_update: true,
              can_delete: true,
              created_at: now,
              updated_at: now,
            }))
          );
        }
      }
      roleIds[role.code] = row.id;
    }

    // ---- Karyawan + akun login ----
    for (const k of KARYAWAN) {
      const [karyawan] = await q(queryInterface, 'SELECT id FROM karyawan WHERE nip = :nip LIMIT 1', { nip: k.nip });
      if (!karyawan) {
        await queryInterface.bulkInsert('karyawan', [
          {
            nip: k.nip,
            nama_lengkap: k.nama,
            email: k.email,
            jabatan: k.jabatan,
            is_active: true,
            is_delete: false,
            created_at: now,
            updated_at: now,
          },
        ]);
      }

      const username = k.nip;
      const [user] = await q(queryInterface, 'SELECT id FROM users WHERE username = :username LIMIT 1', { username });
      if (!user) {
        await queryInterface.bulkInsert('users', [
          {
            role_id: roleIds[k.role],
            name: k.nama,
            username,
            email: k.email ?? `${k.nip}@${EMAIL_DOMAIN}`,
            password: await bcrypt.hash(k.nip, 10),
            is_active: true,
            created_at: now,
            updated_at: now,
          },
        ]);
      }
    }
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('users', { username: KARYAWAN.map((k) => k.nip) });
    await queryInterface.bulkDelete('karyawan', { nip: KARYAWAN.map((k) => k.nip) });
    const roles = await q(queryInterface, 'SELECT id FROM roles WHERE code IN (:codes)', { codes: ROLES.map((r) => r.code) });
    if (roles.length) {
      await queryInterface.bulkDelete('role_menu_permissions', { role_id: roles.map((r) => r.id) });
      await queryInterface.bulkDelete('roles', { id: roles.map((r) => r.id) });
    }
  },
};
