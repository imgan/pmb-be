'use strict';

const JURUSAN_NAMES = ['D3 Farmasi', 'D3 Manajemen Logistik', 'D3 Administrasi Rumah Sakit', 'D4 Teknologi Rekayasa Multimedia'];

const TARIF = {
  'D3 Farmasi': { biayaSks: 150000, biayaBpp: 1200000, biayaSpp: 800000 },
  'D3 Manajemen Logistik': { biayaSks: 140000, biayaBpp: 1100000, biayaSpp: 750000 },
  'D3 Administrasi Rumah Sakit': { biayaSks: 140000, biayaBpp: 1100000, biayaSpp: 750000 },
  'D4 Teknologi Rekayasa Multimedia': { biayaSks: 180000, biayaBpp: 1500000, biayaSpp: 1000000 },
};

const TAHUN_ANGKATAN = [2025, 2026];

module.exports = {
  up: async (queryInterface) => {
    const [users] = await queryInterface.sequelize.query("SELECT id FROM users WHERE username = 'superadmin' LIMIT 1");
    const actorId = users[0].id;

    const [jurusanList] = await queryInterface.sequelize.query(
      `SELECT id, nama_jurusan FROM jurusan WHERE nama_jurusan IN (${JURUSAN_NAMES.map((n) => `'${n}'`).join(', ')})`
    );
    if (jurusanList.length === 0) return;

    const now = new Date();
    const rows = [];
    jurusanList.forEach((jurusan) => {
      const tarif = TARIF[jurusan.nama_jurusan];
      if (!tarif) return;
      TAHUN_ANGKATAN.forEach((tahunAngkatan) => {
        rows.push({
          jurusan_id: jurusan.id,
          tahun_angkatan: tahunAngkatan,
          semester: 1,
          biaya_sks: tarif.biayaSks,
          biaya_bpp: tarif.biayaBpp,
          biaya_spp: tarif.biayaSpp,
          status_belajar: tahunAngkatan === 2026 ? 'BARU' : 'LAMA',
          is_active: true,
          created_by: actorId,
          updated_by: actorId,
          created_at: now,
          updated_at: now,
        });
      });
    });

    if (rows.length) {
      await queryInterface.bulkInsert('tarif_kuliah', rows);
    }
  },
  down: async (queryInterface) => {
    const [jurusanList] = await queryInterface.sequelize.query(
      `SELECT id FROM jurusan WHERE nama_jurusan IN (${JURUSAN_NAMES.map((n) => `'${n}'`).join(', ')})`
    );
    if (jurusanList.length) {
      await queryInterface.bulkDelete('tarif_kuliah', {
        jurusan_id: jurusanList.map((j) => j.id),
        tahun_angkatan: TAHUN_ANGKATAN,
      });
    }
  },
};
