'use strict';

module.exports = {
  up: async (queryInterface) => {
    const [rows] = await queryInterface.sequelize.query(
      'SELECT DISTINCT kode_mata_kuliah, nama_mata_kuliah, sks FROM jadwal_kuliah ORDER BY kode_mata_kuliah ASC'
    );
    if (rows.length === 0) return;

    const [users] = await queryInterface.sequelize.query("SELECT id FROM users WHERE username = 'superadmin' LIMIT 1");
    const actorId = users.length ? users[0].id : null;
    const now = new Date();

    const seen = new Set();
    const mataKuliahRows = [];
    rows.forEach((r) => {
      if (seen.has(r.kode_mata_kuliah)) return;
      seen.add(r.kode_mata_kuliah);
      mataKuliahRows.push({
        kode_mk: r.kode_mata_kuliah,
        nama_mk: r.nama_mata_kuliah,
        sks: r.sks ?? 0,
        is_delete: false,
        created_by: actorId,
        updated_by: actorId,
        created_at: now,
        updated_at: now,
      });
    });

    await queryInterface.bulkInsert('mata_kuliah', mataKuliahRows);

    const [mataKuliahList] = await queryInterface.sequelize.query('SELECT id, kode_mk FROM mata_kuliah');
    const idByKode = new Map(mataKuliahList.map((m) => [m.kode_mk, m.id]));

    for (const kode of seen) {
      const mkId = idByKode.get(kode);
      if (!mkId) continue;
      await queryInterface.sequelize.query(
        'UPDATE jadwal_kuliah SET mata_kuliah_id = :mkId WHERE kode_mata_kuliah = :kode',
        { replacements: { mkId, kode } }
      );
    }
  },
  down: async (queryInterface) => {
    await queryInterface.sequelize.query('UPDATE jadwal_kuliah SET mata_kuliah_id = NULL');
    await queryInterface.bulkDelete('mata_kuliah', {});
  },
};
