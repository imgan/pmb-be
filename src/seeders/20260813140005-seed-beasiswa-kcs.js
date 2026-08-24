'use strict';

const konten = `
<p>Beasiswa <strong>KCS (Kartu Cilegon Sejahtera)</strong> adalah bantuan biaya pendidikan dari pemerintah Pemkot Cilegon bagi lulusan Sekolah Menengah Atas (SMA) atau sederajat yang memiliki potensi akademik baik tetapi memiliki keterbatasan ekonomi. KIP Kuliah diberikan kepada mahasiswa yang lulus seleksi masuk perguruan tinggi berupa bantuan pendidikan yaitu dukungan biaya pendidikan yang diberikan pemerintah kepada mahasiswa untuk mengikuti dan/atau menyelesaikan Pendidikan Tinggi.</p>

<h2>Persyaratan Penerima Beasiswa KCS</h2>
<p>Adapun persyaratan penerima beasiswa KCS adalah sebagai berikut:</p>
<ol>
  <li>Penerima beasiswa KCS adalah siswa SMA atau sederajat yang telah lulus maksimal pada 3 (tiga) tahun sebelumnya</li>
  <li>Memiliki potensi akademik baik tetapi memiliki keterbatasan ekonomi yang didukung dengan Surat Keterangan Tidak Mampu (SKTM) dari Kecamatan setempat</li>
  <li>Lulus seleksi penerimaan mahasiswa baru, dan diterima di Politeknik Bhakti Kartini pada Prodi yang dipilih oleh calon mahasiswa</li>
  <li>Tidak harus memiliki kartu KCS fisik dari Pemkot Cilegon</li>
  <li>Tidak sedang menerima beasiswa lain</li>
</ol>

<h2>Pendaftaran KCS (Kartu Cilegon Sejahtera)</h2>
<p>Tata cara pendaftaran Beasiswa KCS untuk seluruh jalur masuk dilakukan secara online melalui laman Penerimaan Mahasiswa Baru (PMB) yaitu <a href="/pendaftaran/masuk">halaman login PMB</a></p>
<ol>
  <li>Melengkapi form yang tersedia pada <a href="/pendaftaran">halaman pendaftaran</a></li>
  <li>Calon Penerima Beasiswa melakukan proses seleksi administrasi dan Tes Minat Bakat dari Politeknik Bhakti Kartini</li>
  <li>Calon penerima Beasiswa KCS yang dinyatakan lulus akan menerima Letter of Acceptance (LoA)</li>
  <li>Politeknik Bhakti Kartini memvalidasi dokumen dan memproses Beasiswa</li>
  <li>Penerima yang lulus dan diterima menjadi Penerima Beasiswa KCS akan dinyatakan secara sah melalui Surat Keterangan Direktur Politeknik Bhakti Kartini</li>
</ol>
`.trim();

module.exports = {
  up: async (queryInterface) => {
    const [users] = await queryInterface.sequelize.query("SELECT id FROM users WHERE username = 'superadmin' LIMIT 1");
    const actorId = users[0].id;
    const now = new Date();

    await queryInterface.bulkInsert('beasiswa', [
      {
        nama_beasiswa: 'Beasiswa Pemkot Cilegon (KCS)',
        slug: 'kcs',
        ringkasan:
          'Bantuan biaya pendidikan dari Pemkot Cilegon bagi lulusan SMA/sederajat berprestasi dengan keterbatasan ekonomi.',
        konten,
        order_number: 2,
        is_active: true,
        created_by: actorId,
        updated_by: actorId,
        created_at: now,
        updated_at: now,
      },
    ]);
  },
  down: async (queryInterface) => {
    await queryInterface.bulkDelete('beasiswa', { slug: 'kcs' });
  },
};
