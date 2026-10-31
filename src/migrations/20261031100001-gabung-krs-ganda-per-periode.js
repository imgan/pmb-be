'use strict';

/**
 * Satu mahasiswa = satu KRS per periode. KRS ganda (biasanya KRS mata kuliah mengulang yang dibuat manual dengan semester
 * lain) digabung ke KRS dengan semester terbesar: mata kuliahnya dipindahkan, KRS lainnya dihapus.
 * Tidak bisa dibatalkan otomatis (down kosong) karena baris asal sudah tidak ada.
 */
module.exports = {
  up: async (queryInterface) => {
    const q = (sql, replacements, transaction) => queryInterface.sequelize.query(sql, { replacements, transaction }).then(([rows]) => rows);
    await queryInterface.sequelize.transaction(async (transaction) => {
      const ganda = await q(
        'SELECT mahasiswa_id, tahun_ajaran_id FROM krs GROUP BY mahasiswa_id, tahun_ajaran_id HAVING COUNT(*) > 1',
        {},
        transaction
      );
      for (const g of ganda) {
        const list = await q(
          'SELECT id FROM krs WHERE mahasiswa_id = :m AND tahun_ajaran_id = :t ORDER BY semester DESC, id DESC',
          { m: g.mahasiswa_id, t: g.tahun_ajaran_id },
          transaction
        );
        const [utama, ...sisa] = list.map((k) => k.id);
        for (const id of sisa) {
          // Kelas yang sudah ada di KRS utama tidak dipindah (ikut terhapus bersama KRS asalnya).
          await q(
            'UPDATE krs_detail d SET d.krs_id = :utama WHERE d.krs_id = :id AND NOT EXISTS (SELECT 1 FROM (SELECT jadwal_kuliah_id FROM krs_detail WHERE krs_id = :utama) x WHERE x.jadwal_kuliah_id = d.jadwal_kuliah_id)',
            { utama, id },
            transaction
          );
          await q('DELETE FROM krs WHERE id = :id', { id }, transaction);
        }
      }
    });
  },

  down: async () => {},
};
