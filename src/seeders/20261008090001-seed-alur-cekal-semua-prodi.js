'use strict';

/**
 * Alur cekal yang disepakati, diterapkan ke semua prodi (semua baris jurusan):
 * 1. Pengisian KRS                                     : minimal 15% dibayar (1 bulan)
 * 2. Kehadiran UTS                                     : minimal 50% dibayar (3 bulan)
 * 3. Lihat nilai, cetak KHS & Daftar Nilai Sementara   : 100% (lunas)
 */
const RULE = { krs_aktif: true, min_bayar_krs: 15, uts_aktif: true, min_bayar_uts: 50, nilai_aktif: true, min_bayar_nilai: 100 };

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();
    const [jurusan] = await queryInterface.sequelize.query('SELECT id FROM jurusan');
    const [existing] = await queryInterface.sequelize.query('SELECT jurusan_id FROM batas_tagihan_akademik');
    const ada = new Set(existing.map((r) => r.jurusan_id));
    await queryInterface.sequelize.query(
      'UPDATE batas_tagihan_akademik SET krs_aktif = 1, min_bayar_krs = 15, uts_aktif = 1, min_bayar_uts = 50, nilai_aktif = 1, min_bayar_nilai = 100, updated_at = NOW()'
    );
    const baru = jurusan.filter((j) => !ada.has(j.id)).map((j) => ({ jurusan_id: j.id, ...RULE, created_by: 1, updated_by: 1, created_at: now, updated_at: now }));
    if (baru.length) await queryInterface.bulkInsert('batas_tagihan_akademik', baru);
  },
  down: async () => {},
};
