'use strict';

const JURUSAN_NAMES = ['D3 Farmasi', 'D3 Manajemen Logistik', 'D3 Administrasi Rumah Sakit', 'D4 Teknologi Rekayasa Multimedia'];
const PERIODE = 2026;

const TARIF = {
  'D3 Farmasi': { biayaPendaftaran: 500000, biayaPerpanjangan: 250000 },
  'D3 Manajemen Logistik': { biayaPendaftaran: 450000, biayaPerpanjangan: 225000 },
  'D3 Administrasi Rumah Sakit': { biayaPendaftaran: 450000, biayaPerpanjangan: 225000 },
  'D4 Teknologi Rekayasa Multimedia': { biayaPendaftaran: 650000, biayaPerpanjangan: 325000 },
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
          biaya_pendaftaran: tarif.biayaPendaftaran,
          biaya_perpanjangan: tarif.biayaPerpanjangan,
          is_active: true,
          created_by: actorId,
          updated_by: actorId,
          created_at: now,
          updated_at: now,
        };
      });

    if (rows.length) {
      await queryInterface.bulkInsert('tarif_ta_skripsi', rows);
    }
  },
  down: async (queryInterface) => {
    const [jurusanList] = await queryInterface.sequelize.query(
      `SELECT id FROM jurusan WHERE nama_jurusan IN (${JURUSAN_NAMES.map((n) => `'${n}'`).join(', ')})`
    );
    if (jurusanList.length) {
      await queryInterface.bulkDelete('tarif_ta_skripsi', { jurusan_id: jurusanList.map((j) => j.id), periode: PERIODE });
    }
  },
};
