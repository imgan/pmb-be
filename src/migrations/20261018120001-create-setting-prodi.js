'use strict';

/**
 * Setting Program Studi per periode (tahun ajaran): kurikulum mahasiswa baru, KRS & validasi, KHS & nilai,
 * ujian dan lain-lain. Dibuka dari tombol "Setting Prodi" di pojok kanan atas modul Prodi — menu-nya
 * (PRODI_SETTING_MANAGEMENT) hanya untuk hak akses, tidak tampil di sidebar. Hak akses disalin dari menu
 * Kurikulum.
 */
const MENU = { name: 'Setting Prodi', code: 'PRODI_SETTING_MANAGEMENT', path: '/setting', icon: 'settings' };

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tgl = { type: Sequelize.DATEONLY, allowNull: true };
    const ya = (def = false) => ({ type: Sequelize.BOOLEAN, allowNull: false, defaultValue: def });
    await queryInterface.createTable('setting_prodi', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      jurusan_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'jurusan', key: 'id' }, onDelete: 'CASCADE' },
      tahun_ajaran_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'tahun_ajaran', key: 'id' }, onDelete: 'CASCADE' },
      kurikulum_mahasiswa_baru_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'kurikulum', key: 'id' }, onDelete: 'SET NULL' },
      // KRS & Validasi
      buka_krs: ya(),
      tanggal_awal_krs: tgl,
      tanggal_akhir_krs: tgl,
      tanggal_awal_perubahan_krs: tgl,
      tanggal_akhir_perubahan_krs: tgl,
      wajib_validasi_pa: ya(true),
      cek_tagihan_krs: ya(),
      maks_sks: { type: Sequelize.INTEGER, allowNull: true },
      // KHS & Nilai
      buka_khs: ya(),
      tanggal_awal_khs: tgl,
      tanggal_akhir_khs: tgl,
      tanggal_cetak_khs: tgl,
      buka_pengisian_nilai: ya(),
      dosen_isi_persentase_komponen: ya(),
      tanggal_awal_pengisian_nilai: tgl,
      tanggal_akhir_pengisian_nilai: tgl,
      // Ujian
      buka_cetak_kartu_ujian: ya(),
      cek_tagihan_ujian: ya(),
      min_kehadiran_uts: { type: Sequelize.INTEGER, allowNull: true },
      min_kehadiran_uas: { type: Sequelize.INTEGER, allowNull: true },
      // Lain-lain
      keterangan: { type: Sequelize.TEXT, allowNull: true },
      created_by: { type: Sequelize.INTEGER, allowNull: true },
      updated_by: { type: Sequelize.INTEGER, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('setting_prodi', ['jurusan_id', 'tahun_ajaran_id'], { name: 'uq_setting_prodi_jurusan_ta', unique: true });

    // Menu & hak akses (salin dari menu Kurikulum).
    const q = (sql, replacements) => queryInterface.sequelize.query(sql, { replacements, type: queryInterface.sequelize.QueryTypes.SELECT });
    const [existing] = await q('SELECT id FROM menus WHERE code = :code LIMIT 1', { code: MENU.code });
    if (existing) return;
    const [last] = await q("SELECT MAX(order_number) AS n FROM menus WHERE module = 'prodi' AND parent_id IS NULL");
    const now = new Date();
    await queryInterface.bulkInsert('menus', [
      { parent_id: null, ...MENU, order_number: (last?.n ?? 0) + 1, is_active: true, is_public: false, module: 'prodi', created_at: now, updated_at: now },
    ]);
    const [menu] = await q('SELECT id FROM menus WHERE code = :code LIMIT 1', { code: MENU.code });
    const perms = await q(
      `SELECT p.role_id, p.can_create, p.can_read, p.can_update, p.can_delete
         FROM role_menu_permissions p JOIN menus m ON m.id = p.menu_id WHERE m.code = 'PRODI_KURIKULUM_MANAGEMENT'`
    );
    if (perms.length) {
      await queryInterface.bulkInsert(
        'role_menu_permissions',
        perms.map((p) => ({ ...p, menu_id: menu.id, created_at: now, updated_at: now }))
      );
    }
  },

  down: async (queryInterface) => {
    const q = (sql, replacements) => queryInterface.sequelize.query(sql, { replacements, type: queryInterface.sequelize.QueryTypes.SELECT });
    const [menu] = await q('SELECT id FROM menus WHERE code = :code LIMIT 1', { code: MENU.code });
    if (menu) {
      await queryInterface.bulkDelete('role_menu_permissions', { menu_id: menu.id });
      await queryInterface.bulkDelete('menus', { id: menu.id });
    }
    await queryInterface.dropTable('setting_prodi');
  },
};
