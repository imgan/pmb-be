'use strict';

/**
 * E-learning: tagline konten bisa lebih dari satu. Kolom tagline diperlebar & menyimpan array JSON
 * (mis. ["Wajib","Baru"]); nilai tunggal lama dikonversi menjadi array satu elemen.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('elearning_konten', 'tagline', { type: Sequelize.STRING(500), allowNull: true });
    const rows = await queryInterface.sequelize.query("SELECT id, tagline FROM elearning_konten WHERE tagline IS NOT NULL AND tagline <> ''", {
      type: queryInterface.sequelize.QueryTypes.SELECT,
    });
    for (const r of rows) {
      if (String(r.tagline).trim().startsWith('[')) continue;
      await queryInterface.sequelize.query('UPDATE elearning_konten SET tagline = :v WHERE id = :id', {
        replacements: { v: JSON.stringify([String(r.tagline).trim()]), id: r.id },
      });
    }
  },
  down: async (queryInterface, Sequelize) => {
    const rows = await queryInterface.sequelize.query("SELECT id, tagline FROM elearning_konten WHERE tagline LIKE '[%'", {
      type: queryInterface.sequelize.QueryTypes.SELECT,
    });
    for (const r of rows) {
      let pertama = null;
      try {
        pertama = JSON.parse(r.tagline)[0] ?? null;
      } catch {
        pertama = null;
      }
      await queryInterface.sequelize.query('UPDATE elearning_konten SET tagline = :v WHERE id = :id', { replacements: { v: pertama, id: r.id } });
    }
    await queryInterface.changeColumn('elearning_konten', 'tagline', { type: Sequelize.STRING(50), allowNull: true });
  },
};
