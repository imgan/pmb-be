'use strict';

// Isi awal Master Ruangan dari ruang fisik yang sudah dipakai di jadwal kuliah. Isian jadwal berformat
// "R.2.3 (10.00-12.00)" diambil nama ruangnya saja; isian mode belajar ("Online (...)",
// "Offline/Blended, Lab/Project (...)") bukan ruang fisik sehingga tidak dimasukkan.
const POLA_RUANG = /^(R\.\d+(?:\.\d+)*)\b/i;

module.exports = {
  up: async (queryInterface) => {
    const [rows] = await queryInterface.sequelize.query('SELECT DISTINCT ruangan FROM jadwal_kuliah WHERE ruangan IS NOT NULL');
    const nama = [...new Set(rows.map((r) => POLA_RUANG.exec(String(r.ruangan).trim())?.[1]).filter(Boolean))];
    if (!nama.length) return;
    const [ada] = await queryInterface.sequelize.query('SELECT nama_ruang FROM ruangan WHERE is_delete = false AND nama_ruang IN (:nama)', {
      replacements: { nama },
    });
    const sudah = new Set(ada.map((r) => r.nama_ruang));
    const now = new Date();
    const baru = nama
      .filter((n) => !sudah.has(n))
      .map((n) => ({
        nama_ruang: n,
        lantai: Number(n.split('.')[1]) || null,
        projector: false,
        fungsi: 'Ruang Belajar Mengajar',
        is_delete: false,
        created_at: now,
        updated_at: now,
      }));
    if (baru.length) await queryInterface.bulkInsert('ruangan', baru);
  },
  down: async () => {},
};
