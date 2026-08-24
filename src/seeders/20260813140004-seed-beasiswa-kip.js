'use strict';

const konten = `
<p>Beasiswa <strong>KIP-Kuliah</strong> adalah bantuan biaya pendidikan dari pemerintah bagi lulusan Sekolah Menengah Atas (SMA) atau sederajat yang memiliki potensi akademik baik tetapi memiliki keterbatasan ekonomi. KIP Kuliah diberikan kepada mahasiswa yang lulus seleksi masuk perguruan tinggi. KIP Kuliah sesuai dengan penjelasan Pasal 76 UU No. 12 Tahun 2012 Ayat 2 huruf b tentang bantuan pendidikan yaitu dukungan biaya pendidikan yang diberikan pemerintah kepada mahasiswa untuk mengikuti dan/atau menyelesaikan Pendidikan Tinggi.</p>

<h2>Persyaratan Penerima KIP Kuliah</h2>
<p>Adapun persyaratan penerima KIP Kuliah adalah sebagai berikut:</p>
<ol>
  <li>Penerima KIP Kuliah adalah siswa SMA atau sederajat yang telah lulus maksimal pada 3 (tiga) tahun sebelumnya</li>
  <li>Memiliki potensi akademik baik tetapi memiliki keterbatasan ekonomi yang didukung bukti dokumen yang sah</li>
  <li>Lulus seleksi penerimaan mahasiswa baru, dan diterima di PTS pada Prodi yang dipilih oleh calon mahasiswa</li>
  <li>Keterbatasan ekonomi dibuktikan dengan kepemilikan program bantuan pendidikan nasional dalam bentuk Kartu Indonesia Pintar (KIP) atau berasal dari keluarga peserta Program Keluarga Harapan (PKH), keluarga pemegang Kartu Keluarga Sejahtera (KKS) serta mahasiswa dari panti sosial/panti asuhan</li>
  <li>Dalam hal mahasiswa belum memiliki KIP atau orang tua/wali belum memiliki KKS, maka dapat tetap mendaftar untuk mendapatkan KIP Kuliah asalkan memenuhi persyaratan tidak mampu secara ekonomi sesuai dengan ketentuan, yang dibuktikan dengan pendapatan kotor gabungan orang tua/wali sebesar Rp 4.000.000,00 (empat juta rupiah) atau pendapatan kotor gabungan orang tua/wali dibagi jumlah anggota keluarga maksimal Rp750.000,00 (tujuh ratus lima puluh ribu rupiah)</li>
  <li>Tidak sedang menerima beasiswa lain</li>
</ol>

<h2>Pendaftaran KIP Kuliah</h2>
<p>Tata cara pendaftaran KIP Kuliah untuk seluruh jalur masuk dilakukan secara online melalui laman KIP Kuliah yaitu <a href="https://kip-kuliah.kemdikbud.go.id" target="_blank" rel="noopener">kip-kuliah.kemdikbud.go.id</a></p>
<ol>
  <li>Siswa dapat langsung melakukan pendaftaran secara mandiri di sistem online KIP Kuliah melalui laman <a href="https://kip-kuliah.kemdikbud.go.id" target="_blank" rel="noopener">kip-kuliah.kemdikbud.go.id</a> atau melalui KIP Kuliah mobile apps yang dapat diunduh di Play Store</li>
  <li>Pada saat pendaftaran, siswa memasukkan NIK, NISN, NPSN dan alamat email yang aktif</li>
  <li>Sistem KIP Kuliah selanjutnya akan melakukan validasi NIK, NISN dan NPSN serta kelayakan mendapatkan KIP Kuliah</li>
  <li>Jika proses validasi berhasil, Sistem KIP Kuliah selanjutnya akan mengirimkan Nomor Pendaftaran dan Kode Akses ke alamat email yang didaftarkan</li>
  <li>Siswa menyelesaikan proses pendaftaran KIP Kuliah dan memilih proses seleksi Mandiri dan memilih Politeknik Bhakti Kartini serta Program Studi yang dipilih</li>
  <li>Siswa menyelesaikan proses pendaftaran di portal atau sistem informasi seleksi nasional masuk perguruan tinggi sesuai jalur yang dipilih lalu mengklik simpan</li>
</ol>
`.trim();

module.exports = {
  up: async (queryInterface) => {
    const [users] = await queryInterface.sequelize.query("SELECT id FROM users WHERE username = 'superadmin' LIMIT 1");
    const actorId = users[0].id;
    const now = new Date();

    await queryInterface.bulkInsert('beasiswa', [
      {
        nama_beasiswa: 'Beasiswa Kartu Indonesia Pintar (KIP)',
        slug: 'kip',
        ringkasan:
          'Bantuan biaya pendidikan dari pemerintah bagi lulusan SMA/sederajat berprestasi dengan keterbatasan ekonomi.',
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
    await queryInterface.bulkDelete('beasiswa', { slug: 'kip' });
  },
};
