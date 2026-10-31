'use strict';

/**
 * Alur cekal disepakati dalam "minimal % sudah dibayar dari total tagihan" (bukan maksimal %
 * tunggakan), dan ditambah filter Kehadiran UTS. Nilai lama dikonversi: minBayar = 100 - batas.
 */
module.exports = {
  up: async (queryInterface) => {
    const q = (sql) => queryInterface.sequelize.query(sql);
    await q(`ALTER TABLE batas_tagihan_akademik
      ADD COLUMN min_bayar_krs DECIMAL(5,2) NOT NULL DEFAULT 0 AFTER krs_aktif,
      ADD COLUMN uts_aktif TINYINT(1) NOT NULL DEFAULT 0 AFTER min_bayar_krs,
      ADD COLUMN min_bayar_uts DECIMAL(5,2) NOT NULL DEFAULT 0 AFTER uts_aktif,
      ADD COLUMN min_bayar_nilai DECIMAL(5,2) NOT NULL DEFAULT 0 AFTER nilai_aktif`);
    await q('UPDATE batas_tagihan_akademik SET min_bayar_krs = 100 - batas_krs, min_bayar_nilai = 100 - batas_nilai');
    await q('ALTER TABLE batas_tagihan_akademik DROP COLUMN batas_krs, DROP COLUMN batas_nilai');
  },
  down: async (queryInterface) => {
    const q = (sql) => queryInterface.sequelize.query(sql);
    await q(`ALTER TABLE batas_tagihan_akademik
      ADD COLUMN batas_krs DECIMAL(5,2) NOT NULL DEFAULT 0 AFTER krs_aktif,
      ADD COLUMN batas_nilai DECIMAL(5,2) NOT NULL DEFAULT 0 AFTER nilai_aktif`);
    await q('UPDATE batas_tagihan_akademik SET batas_krs = 100 - min_bayar_krs, batas_nilai = 100 - min_bayar_nilai');
    await q('ALTER TABLE batas_tagihan_akademik DROP COLUMN min_bayar_krs, DROP COLUMN uts_aktif, DROP COLUMN min_bayar_uts, DROP COLUMN min_bayar_nilai');
  },
};
