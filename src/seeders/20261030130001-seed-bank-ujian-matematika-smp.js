'use strict';

// Dummy Bank Ujian LMS: Matematika SMP — 15 soal pilihan ganda (dengan kunci) + 3 essay (pedoman jawaban di pertanyaan
// tidak ditampilkan; lihat komentar PEDOMAN). Dipakai mencoba tes seleksi PMB online.
const JUDUL = 'Tes Potensi Matematika SMP';

// [pertanyaan, pilihan, index jawaban benar]
const PG = [
  ['Hasil dari 125 + 375 − 250 adalah ...', ['200', '250', '300', '350'], 1],
  ['Hasil dari (−8) × 6 : (−4) adalah ...', ['−12', '12', '−48', '48'], 1],
  ['Bentuk sederhana dari 3/4 + 2/3 adalah ...', ['5/7', '17/12', '5/12', '1 1/2'], 1],
  ['Nilai dari 2⁵ adalah ...', ['10', '16', '25', '32'], 3],
  ['Nilai dari √144 + √81 adalah ...', ['19', '21', '23', '25'], 1],
  ['Jika 3x − 7 = 14, maka nilai x adalah ...', ['5', '6', '7', '8'], 2],
  ['Bentuk sederhana dari 4a + 3b − 2a + 5b adalah ...', ['2a + 8b', '6a + 8b', '2a + 2b', '6a − 2b'], 0],
  ['Harga 4 buku Rp20.000. Harga 10 buku yang sama adalah ...', ['Rp40.000', 'Rp45.000', 'Rp50.000', 'Rp60.000'], 2],
  ['Sebuah baju seharga Rp150.000 mendapat diskon 20%. Harga setelah diskon adalah ...', ['Rp100.000', 'Rp110.000', 'Rp120.000', 'Rp130.000'], 2],
  ['Keliling persegi dengan panjang sisi 9 cm adalah ...', ['18 cm', '27 cm', '36 cm', '81 cm'], 2],
  ['Luas segitiga dengan alas 12 cm dan tinggi 8 cm adalah ...', ['48 cm²', '64 cm²', '96 cm²', '20 cm²'], 0],
  ['Luas lingkaran dengan jari-jari 7 cm (π = 22/7) adalah ...', ['44 cm²', '88 cm²', '154 cm²', '308 cm²'], 2],
  ['Pada segitiga siku-siku, panjang kedua sisi siku-sikunya 6 cm dan 8 cm. Panjang sisi miringnya adalah ...', ['9 cm', '10 cm', '12 cm', '14 cm'], 1],
  ['Rata-rata dari data 6, 7, 8, 9, 10 adalah ...', ['7', '7,5', '8', '8,5'], 2],
  ['Gradien garis yang melalui titik (1, 2) dan (3, 8) adalah ...', ['2', '3', '4', '6'], 1],
];

// [pertanyaan, bobot] — PEDOMAN jawaban untuk korektor:
//  1. 2x + 5 < 17 → 2x < 12 → x < 6; bilangan asli: {1, 2, 3, 4, 5}.
//  2. Volume = 10 × 6 × 5 = 300 cm³; luas permukaan = 2(60 + 50 + 30) = 280 cm².
//  3. Misal harga pensil p, buku b: 2p + 3b = 13.000 dan p + b = 5.000 → b = 3.000, p = 2.000.
const ESSAY = [
  ['Tentukan himpunan penyelesaian dari pertidaksamaan 2x + 5 < 17 untuk x bilangan asli. Tuliskan langkah-langkahnya.', 2],
  ['Sebuah balok berukuran panjang 10 cm, lebar 6 cm, dan tinggi 5 cm. Hitunglah volume dan luas permukaan balok tersebut.', 3],
  [
    'Andi membeli 2 pensil dan 3 buku seharga Rp13.000. Budi membeli 1 pensil dan 1 buku seharga Rp5.000. Tentukan harga 1 pensil dan harga 1 buku. Tuliskan cara penyelesaiannya.',
    3,
  ],
];

module.exports = {
  up: async (queryInterface) => {
    const [ada] = await queryInterface.sequelize.query('SELECT id FROM bank_ujian WHERE judul = :judul LIMIT 1', { replacements: { judul: JUDUL } });
    if (ada.length) return;
    const now = new Date();
    await queryInterface.bulkInsert('bank_ujian', [
      {
        judul: JUDUL,
        deskripsi:
          'Kerjakan 15 soal pilihan ganda dan 3 soal essay. Pilih satu jawaban yang paling tepat untuk soal pilihan ganda. Untuk soal essay, tuliskan langkah penyelesaiannya. Tidak diperkenankan menggunakan kalkulator.',
        durasi_menit: 60,
        acak_soal: false,
        created_by: 1,
        updated_by: 1,
        created_at: now,
        updated_at: now,
      },
    ]);
    const [[bank]] = await queryInterface.sequelize.query('SELECT id FROM bank_ujian WHERE judul = :judul LIMIT 1', { replacements: { judul: JUDUL } });
    const soal = [
      ...PG.map(([pertanyaan, pilihan, benar]) => ({ tipe: 'PG', pertanyaan, pilihan: JSON.stringify(pilihan), jawaban_benar: benar, bobot: 1 })),
      ...ESSAY.map(([pertanyaan, bobot]) => ({ tipe: 'ESSAY', pertanyaan, pilihan: null, jawaban_benar: null, bobot })),
    ];
    await queryInterface.bulkInsert(
      'bank_ujian_soal',
      soal.map((s, i) => ({ ...s, bank_ujian_id: bank.id, urutan: i + 1, created_at: now, updated_at: now }))
    );
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query('DELETE FROM bank_ujian WHERE judul = :judul', { replacements: { judul: JUDUL } });
  },
};
