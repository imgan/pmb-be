'use strict';

/**
 * Pemetaan PL → CPL berbobot: pl_cpl.bobot (persen kontribusi CPL ke satu PL, total per PL = 100) dan
 * kurikulum.metode_bobot_pl_cpl — MANUAL (bobot diisi sendiri) / OTOMATIS (rata: 100 ÷ jumlah CPL dicentang).
 * Pemetaan lama dianggap OTOMATIS; bobotnya dihitung rata.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('pl_cpl', 'bobot', { type: Sequelize.DECIMAL(5, 2), allowNull: false, defaultValue: 0, after: 'cpl_id' });
    await queryInterface.addColumn('kurikulum', 'metode_bobot_pl_cpl', {
      type: Sequelize.ENUM('MANUAL', 'OTOMATIS'),
      allowNull: false,
      defaultValue: 'OTOMATIS',
      after: 'keterangan',
    });
    await queryInterface.sequelize.query(
      `UPDATE pl_cpl x JOIN (SELECT profil_lulusan_id, COUNT(*) n FROM pl_cpl GROUP BY profil_lulusan_id) t
          ON t.profil_lulusan_id = x.profil_lulusan_id SET x.bobot = ROUND(100 / t.n, 2)`
    );
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('kurikulum', 'metode_bobot_pl_cpl');
    await queryInterface.removeColumn('pl_cpl', 'bobot');
  },
};
