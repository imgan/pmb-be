'use strict';

/**
 * Pertanyaan angket dosen dibedakan per Periode Akademik (tahun_ajaran_id) & Tk. Pendidikan
 * (jenjang_pendidikan prodi, mis. "Diploma Tiga"), dengan kategori untuk pengelompokan.
 * Pertanyaan global yang sudah ada dipindahkan ke tahun ajaran aktif untuk setiap jenjang.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('angket_dosen_pertanyaan', 'tahun_ajaran_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: 'id',
      references: { model: 'tahun_ajaran', key: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });
    await queryInterface.addColumn('angket_dosen_pertanyaan', 'jenjang_pendidikan', { type: Sequelize.STRING(50), allowNull: true, after: 'tahun_ajaran_id' });
    await queryInterface.addColumn('angket_dosen_pertanyaan', 'kategori', { type: Sequelize.STRING(100), allowNull: true, after: 'jenjang_pendidikan' });

    const q = (sql, replacements) => queryInterface.sequelize.query(sql, { replacements }).then(([rows]) => rows);
    const [ta] = await q('SELECT id FROM tahun_ajaran WHERE is_active = 1 ORDER BY id DESC LIMIT 1');
    const jenjang = (await q('SELECT DISTINCT jenjang_pendidikan j FROM jurusan WHERE jenjang_pendidikan IS NOT NULL ORDER BY j')).map((r) => r.j);
    const lama = await q('SELECT * FROM angket_dosen_pertanyaan WHERE tahun_ajaran_id IS NULL ORDER BY urutan, id');
    if (ta && jenjang.length && lama.length) {
      // Jenjang pertama memakai baris yang ada; jenjang lain mendapat salinannya.
      await q('UPDATE angket_dosen_pertanyaan SET tahun_ajaran_id = :ta, jenjang_pendidikan = :j WHERE tahun_ajaran_id IS NULL', { ta: ta.id, j: jenjang[0] });
      const now = new Date();
      for (const j of jenjang.slice(1)) {
        await queryInterface.bulkInsert(
          'angket_dosen_pertanyaan',
          lama.map((p) => ({
            tahun_ajaran_id: ta.id,
            jenjang_pendidikan: j,
            kategori: null,
            pertanyaan: p.pertanyaan,
            open_question: p.open_question,
            urutan: p.urutan,
            created_at: now,
            updated_at: now,
          }))
        );
      }
    }
    await queryInterface.sequelize.query('DELETE FROM angket_dosen_pertanyaan WHERE tahun_ajaran_id IS NULL OR jenjang_pendidikan IS NULL');
    await queryInterface.changeColumn('angket_dosen_pertanyaan', 'tahun_ajaran_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: { model: 'tahun_ajaran', key: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });
    await queryInterface.changeColumn('angket_dosen_pertanyaan', 'jenjang_pendidikan', { type: Sequelize.STRING(50), allowNull: false });
    await queryInterface.addIndex('angket_dosen_pertanyaan', ['tahun_ajaran_id', 'jenjang_pendidikan', 'urutan'], { name: 'angket_dosen_pertanyaan_periode' });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('angket_dosen_pertanyaan', 'angket_dosen_pertanyaan_periode');
    await queryInterface.removeColumn('angket_dosen_pertanyaan', 'kategori');
    await queryInterface.removeColumn('angket_dosen_pertanyaan', 'jenjang_pendidikan');
    await queryInterface.removeColumn('angket_dosen_pertanyaan', 'tahun_ajaran_id');
  },
};
