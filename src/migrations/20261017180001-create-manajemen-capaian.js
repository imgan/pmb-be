'use strict';

/**
 * Manajemen Capaian (OBE) per kurikulum: Profil Lulusan (PL), Capaian Pembelajaran Lulusan (CPL),
 * pemetaan PL → CPL dan CPL → Mata Kuliah. Plus menu Prodi → Kurikulum → Manajemen Capaian dengan hak
 * akses yang sama dengan menu Kurikulum.
 */
const MENU = { name: 'Manajemen Capaian', code: 'PRODI_MANAJEMEN_CAPAIAN_MANAGEMENT', path: '/kurikulum/manajemen-capaian', icon: 'track_changes' };

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const ts = {
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    };
    const fkKurikulum = { type: Sequelize.INTEGER, allowNull: false, references: { model: 'kurikulum', key: 'id' }, onDelete: 'CASCADE' };

    await queryInterface.createTable('profil_lulusan', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      kurikulum_id: fkKurikulum,
      kode: { type: Sequelize.STRING(20), allowNull: false },
      deskripsi: { type: Sequelize.TEXT, allowNull: false },
      ...ts,
    });
    await queryInterface.addIndex('profil_lulusan', ['kurikulum_id', 'kode'], { name: 'uq_profil_lulusan_kurikulum_kode', unique: true });

    await queryInterface.createTable('cpl', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      kurikulum_id: fkKurikulum,
      kode: { type: Sequelize.STRING(20), allowNull: false },
      // Aspek CPL sesuai SN-Dikti.
      aspek: { type: Sequelize.ENUM('SIKAP', 'PENGETAHUAN', 'KETERAMPILAN_UMUM', 'KETERAMPILAN_KHUSUS'), allowNull: true },
      deskripsi: { type: Sequelize.TEXT, allowNull: false },
      ...ts,
    });
    await queryInterface.addIndex('cpl', ['kurikulum_id', 'kode'], { name: 'uq_cpl_kurikulum_kode', unique: true });

    await queryInterface.createTable('pl_cpl', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      profil_lulusan_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'profil_lulusan', key: 'id' }, onDelete: 'CASCADE' },
      cpl_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'cpl', key: 'id' }, onDelete: 'CASCADE' },
      ...ts,
    });
    await queryInterface.addIndex('pl_cpl', ['profil_lulusan_id', 'cpl_id'], { name: 'uq_pl_cpl', unique: true });

    await queryInterface.createTable('cpl_mata_kuliah', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      cpl_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'cpl', key: 'id' }, onDelete: 'CASCADE' },
      mata_kuliah_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'mata_kuliah', key: 'id' }, onDelete: 'CASCADE' },
      ...ts,
    });
    await queryInterface.addIndex('cpl_mata_kuliah', ['cpl_id', 'mata_kuliah_id'], { name: 'uq_cpl_mata_kuliah', unique: true });

    // Menu & hak akses (salin dari menu Kurikulum).
    const q = (sql, replacements) => queryInterface.sequelize.query(sql, { replacements, type: queryInterface.sequelize.QueryTypes.SELECT });
    const [existing] = await q('SELECT id FROM menus WHERE code = :code LIMIT 1', { code: MENU.code });
    if (existing) return;
    const [group] = await q("SELECT id FROM menus WHERE code = 'PRODI_KURIKULUM_GROUP_MANAGEMENT' LIMIT 1");
    if (!group) return;
    const [last] = await q('SELECT MAX(order_number) AS n FROM menus WHERE parent_id = :parent', { parent: group.id });
    const now = new Date();
    await queryInterface.bulkInsert('menus', [
      { parent_id: group.id, ...MENU, order_number: (last?.n ?? 0) + 1, is_active: true, is_public: false, module: 'prodi', created_at: now, updated_at: now },
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
    await queryInterface.dropTable('cpl_mata_kuliah');
    await queryInterface.dropTable('pl_cpl');
    await queryInterface.dropTable('cpl');
    await queryInterface.dropTable('profil_lulusan');
  },
};
