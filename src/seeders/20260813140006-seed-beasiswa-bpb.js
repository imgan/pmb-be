'use strict';

const konten = `
<p>Beasiswa <strong>Yayasan Bhakti Kartini (BPB)</strong> adalah bantuan biaya pendidikan dari Politeknik Bhakti Kartini bagi lulusan Sekolah Menengah Atas (SMA) atau sederajat yang memiliki potensi akademik baik tetapi memiliki keterbatasan ekonomi. Beasiswa ini diberikan kepada mahasiswa yang lulus seleksi masuk perguruan tinggi berupa dukungan biaya pendidikan untuk mengikuti dan/atau menyelesaikan Pendidikan Tinggi.</p>

<h2>Persyaratan Penerima Beasiswa</h2>
<p>Untuk mendaftar beasiswa ini, pastikan kamu memenuhi persyaratan berikut:</p>
<ol>
  <li>Penerima adalah siswa SMA atau sederajat yang telah lulus (diutamakan yatim/memiliki prestasi)</li>
  <li>Memiliki potensi akademik baik tetapi memiliki keterbatasan ekonomi yang didukung dengan Surat Keterangan Tidak Mampu (SKTM) dari Kecamatan setempat</li>
  <li>Lulus seleksi penerimaan mahasiswa baru, dan diterima di Politeknik Bhakti Kartini pada Prodi yang dipilih oleh calon mahasiswa</li>
  <li>Tidak sedang menerima beasiswa lain</li>
</ol>

<h2>Pendaftaran Beasiswa Yayasan Bhakti Kartini</h2>
<p>Tata cara pendaftaran beasiswa ini untuk seluruh jalur masuk dilakukan secara online melalui laman Penerimaan Mahasiswa Baru (PMB) yaitu <a href="/pendaftaran/masuk">halaman login PMB</a></p>
<ol>
  <li>Melengkapi form yang tersedia pada <a href="/pendaftaran">halaman pendaftaran</a></li>
  <li>Calon Penerima Beasiswa melakukan proses seleksi administrasi dan Tes Minat Bakat dari Politeknik Bhakti Kartini</li>
  <li>Calon penerima beasiswa yang dinyatakan lulus akan menerima Letter of Acceptance (LoA)</li>
  <li>Politeknik Bhakti Kartini memvalidasi dokumen dan memproses Beasiswa</li>
  <li>Penerima yang lulus dan diterima menjadi Penerima Beasiswa akan dinyatakan secara sah melalui Surat Keterangan Direktur Politeknik Bhakti Kartini</li>
</ol>
`.trim();

module.exports = {
  up: async (queryInterface) => {
    const [users] = await queryInterface.sequelize.query("SELECT id FROM users WHERE username = 'superadmin' LIMIT 1");
    const actorId = users[0].id;
    const now = new Date();

    await queryInterface.bulkInsert('beasiswa', [
      {
        nama_beasiswa: 'Beasiswa Yayasan Bhakti Kartini',
        slug: 'bpb',
        ringkasan:
          'Bantuan biaya pendidikan dari Politeknik Bhakti Kartini bagi lulusan SMA/sederajat berprestasi dengan keterbatasan ekonomi.',
        konten,
        order_number: 3,
        is_active: true,
        created_by: actorId,
        updated_by: actorId,
        created_at: now,
        updated_at: now,
      },
    ]);
  },
  down: async (queryInterface) => {
    await queryInterface.bulkDelete('beasiswa', { slug: 'bpb' });
  },
};
