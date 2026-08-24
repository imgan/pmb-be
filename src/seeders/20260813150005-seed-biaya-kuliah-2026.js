'use strict';

const konten = `
<p>Berikut adalah rincian biaya kuliah bagi mahasiswa baru <strong>Politeknik Bhakti Kartini</strong>.</p>

<h2>Program Diploma Empat (D4)</h2>
<table>
  <tbody>
    <tr><th>Program Studi</th><th>Biaya Kuliah</th><th>Potongan Biaya</th><th>Cukup Bayar</th></tr>
    <tr>
      <td>Teknologi Rekayasa Multimedia</td>
      <td>Rp 50.150.000</td>
      <td>Rp 24.000.000</td>
      <td><strong>Rp 26.150.000</strong></td>
    </tr>
  </tbody>
</table>

<p><strong>Skema Pembayaran Persemester</strong> — dapat diangsur setiap bulannya:</p>
<table>
  <tbody>
    <tr><th>Komponen Biaya</th><th>Semester I</th><th>Semester II - VI</th><th>Semester VII</th><th>Semester VIII</th></tr>
    <tr><td>Angsuran Pertama</td><td>Rp 750.000</td><td>Rp 700.000</td><td>Rp 500.000</td><td>Rp 500.000</td></tr>
    <tr><td>Angsuran Kedua</td><td>Rp 1.000.000</td><td>Rp 1.700.000</td><td>Rp 1.500.000</td><td>Rp 1.400.000</td></tr>
    <tr><td>Angsuran Ketiga</td><td>Rp 600.000</td><td>Rp 1.000.000</td><td>Rp 1.000.000</td><td>Rp 1.000.000</td></tr>
    <tr>
      <td><strong>Total Registrasi</strong></td>
      <td><strong>Rp 2.350.000</strong></td>
      <td><strong>Rp 3.400.000</strong></td>
      <td><strong>Rp 3.000.000</strong></td>
      <td><strong>Rp 2.900.000</strong></td>
    </tr>
  </tbody>
</table>

<p><strong>Keterangan:</strong></p>
<ul>
  <li>Angsuran Pertama: Biaya Registrasi</li>
  <li>Angsuran Kedua: Biaya Sebelum UTS</li>
  <li>Angsuran Ketiga: Biaya Sebelum UAS</li>
</ul>

<h2>Program Diploma Tiga (D3)</h2>
<table>
  <tbody>
    <tr><th>Program Studi</th><th>Biaya Kuliah</th><th>Potongan Biaya</th><th>Cukup Bayar</th></tr>
    <tr>
      <td>Farmasi, Manajemen Logistik, Administrasi Rumah Sakit</td>
      <td>Rp 29.850.000</td>
      <td>Rp 13.500.000</td>
      <td><strong>Rp 16.350.000</strong></td>
    </tr>
  </tbody>
</table>
`.trim();

module.exports = {
  up: async (queryInterface) => {
    const [users] = await queryInterface.sequelize.query("SELECT id FROM users WHERE username = 'superadmin' LIMIT 1");
    const actorId = users[0].id;
    const now = new Date();

    await queryInterface.bulkInsert('biaya_kuliah', [
      {
        judul: 'Biaya Kuliah Mahasiswa Baru 2026/2027',
        slug: '2026-2027',
        ringkasan:
          'Rincian biaya kuliah dan skema pembayaran untuk program Sarjana Terapan dan Diploma Tiga tahun akademik 2026/2027.',
        konten,
        order_number: 1,
        is_active: true,
        created_by: actorId,
        updated_by: actorId,
        created_at: now,
        updated_at: now,
      },
    ]);
  },
  down: async (queryInterface) => {
    await queryInterface.bulkDelete('biaya_kuliah', { slug: '2026-2027' });
  },
};
