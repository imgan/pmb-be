'use strict';

const JURUSAN_NAMES = ['D3 Farmasi', 'D3 Manajemen Logistik', 'D3 Administrasi Rumah Sakit', 'D4 Teknologi Rekayasa Multimedia'];
const PERIODE = 2026;

const TARIF = {
  'D3 Farmasi': { utama: 750000, pendamping: 500000, asisten: 300000, tunggal: 1000000 },
  'D3 Manajemen Logistik': { utama: 700000, pendamping: 450000, asisten: 275000, tunggal: 950000 },
  'D3 Administrasi Rumah Sakit': { utama: 700000, pendamping: 450000, asisten: 275000, tunggal: 950000 },
  'D4 Teknologi Rekayasa Multimedia': { utama: 900000, pendamping: 600000, asisten: 350000, tunggal: 1200000 },
};

module.exports = {
  up: async (queryInterface) => {
    const [users] = await queryInterface.sequelize.query("SELECT id FROM users WHERE username = 'superadmin' LIMIT 1");
    const actorId = users[0].id;

    const [jurusanList] = await queryInterface.sequelize.query(
      `SELECT id, nama_jurusan FROM jurusan WHERE nama_jurusan IN (${JURUSAN_NAMES.map((n) => `'${n}'`).join(', ')})`
    );
    if (jurusanList.length === 0) return;

    const now = new Date();
    const rows = jurusanList
      .filter((jurusan) => TARIF[jurusan.nama_jurusan])
      .map((jurusan) => {
        const tarif = TARIF[jurusan.nama_jurusan];
        return {
          periode: PERIODE,
          jurusan_id: jurusan.id,
          biaya_pembimbing_utama: tarif.utama,
          biaya_pembimbing_pendamping: tarif.pendamping,
          biaya_pembimbing_asisten: tarif.asisten,
          biaya_pembimbing_tunggal: tarif.tunggal,
          is_active: true,
          created_by: actorId,
          updated_by: actorId,
          created_at: now,
          updated_at: now,
        };
      });

    if (rows.length) {
      await queryInterface.bulkInsert('tarif_pembimbing', rows);
    }
  },
  down: async (queryInterface) => {
    const [jurusanList] = await queryInterface.sequelize.query(
      `SELECT id FROM jurusan WHERE nama_jurusan IN (${JURUSAN_NAMES.map((n) => `'${n}'`).join(', ')})`
    );
    if (jurusanList.length) {
      await queryInterface.bulkDelete('tarif_pembimbing', { jurusan_id: jurusanList.map((j) => j.id), periode: PERIODE });
    }
  },
};
