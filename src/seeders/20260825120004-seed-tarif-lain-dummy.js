'use strict';

const TAHUN_MASUK = 2026;

const ROWS = [
  { kodeBiaya: 'ALMAMATER', biaya: 350000, keterangan: 'Biaya jaket almamater' },
  { kodeBiaya: 'KTM', biaya: 50000, keterangan: 'Biaya cetak Kartu Tanda Mahasiswa' },
  { kodeBiaya: 'ASURANSI', biaya: 100000, keterangan: 'Biaya asuransi mahasiswa per tahun' },
  { kodeBiaya: 'ORIENTASI', biaya: 250000, keterangan: 'Biaya orientasi mahasiswa baru' },
  { kodeBiaya: 'WISUDA', biaya: 1500000, keterangan: 'Biaya prosesi wisuda' },
];

module.exports = {
  up: async (queryInterface) => {
    const [users] = await queryInterface.sequelize.query("SELECT id FROM users WHERE username = 'superadmin' LIMIT 1");
    const actorId = users[0].id;
    const now = new Date();

    await queryInterface.bulkInsert(
      'tarif_lain',
      ROWS.map((row) => ({
        kode_biaya: row.kodeBiaya,
        tahun_masuk: TAHUN_MASUK,
        biaya: row.biaya,
        keterangan: row.keterangan,
        is_active: true,
        created_by: actorId,
        updated_by: actorId,
        created_at: now,
        updated_at: now,
      }))
    );
  },
  down: async (queryInterface) => {
    await queryInterface.bulkDelete('tarif_lain', {
      kode_biaya: ROWS.map((r) => r.kodeBiaya),
      tahun_masuk: TAHUN_MASUK,
    });
  },
};
