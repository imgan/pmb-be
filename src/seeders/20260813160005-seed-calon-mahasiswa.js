'use strict';

module.exports = {
  up: async (queryInterface) => {
    const [users] = await queryInterface.sequelize.query("SELECT id FROM users WHERE username = 'superadmin' LIMIT 1");
    const actorId = users[0].id;
    const now = new Date();

    const rows = [
      { nama: 'Muhammad Rizal', asalSekolah: 'SMKS YP 17 Cilegon', prodi: 'D4 - Rekayasa Keamanan Siber', noTelepon: '081234561001', skemaPembiayaan: 'beasiswa', formulirPendaftaran: true, lulusTesMasuk: true, akunBeasiswa: false, kelengkapanPersyaratan: false, statusBeasiswa: 'diusulkan', statusKuliah: 'diterima' },
      { nama: 'Siti Aminah', asalSekolah: 'SMA Negeri 4 Kota Serang', prodi: 'D4 - Bisnis Digital', noTelepon: '081234561002', skemaPembiayaan: 'beasiswa', formulirPendaftaran: true, lulusTesMasuk: true, akunBeasiswa: false, kelengkapanPersyaratan: false, statusBeasiswa: 'diusulkan', statusKuliah: 'diterima' },
      { nama: 'Dedi Kurniawan', asalSekolah: 'SMK Bina Cendikia', prodi: 'D4 - Bisnis Digital', noTelepon: '081234561003', skemaPembiayaan: 'beasiswa', formulirPendaftaran: true, lulusTesMasuk: true, akunBeasiswa: false, kelengkapanPersyaratan: false, statusBeasiswa: 'diusulkan', statusKuliah: 'diterima' },
      { nama: 'Putri Wulandari', asalSekolah: 'SMK N 1 Kota Serang', prodi: 'D4 - Bisnis Digital', noTelepon: '081234561004', skemaPembiayaan: 'mandiri', formulirPendaftaran: true, lulusTesMasuk: true, akunBeasiswa: null, kelengkapanPersyaratan: false, statusBeasiswa: null, statusKuliah: 'diterima' },
      { nama: 'Andika Pratama', asalSekolah: 'SMKS Yabhinka Cilegon', prodi: 'D4 - Bisnis Digital', noTelepon: '081234561005', skemaPembiayaan: 'beasiswa', formulirPendaftaran: true, lulusTesMasuk: true, akunBeasiswa: false, kelengkapanPersyaratan: false, statusBeasiswa: 'diusulkan', statusKuliah: 'diterima' },
      { nama: 'Nurul Fadilah', asalSekolah: 'SMAN 1 Bojonegara', prodi: 'D4 - Bisnis Digital', noTelepon: '081234561006', skemaPembiayaan: 'beasiswa', formulirPendaftaran: true, lulusTesMasuk: true, akunBeasiswa: true, kelengkapanPersyaratan: false, statusBeasiswa: 'diusulkan', statusKuliah: 'diterima' },
      { nama: 'Rangga Saputra', asalSekolah: 'SMKS Yabhinka Cilegon', prodi: 'D4 - Bisnis Digital', noTelepon: '081234561007', skemaPembiayaan: 'beasiswa', formulirPendaftaran: true, lulusTesMasuk: true, akunBeasiswa: true, kelengkapanPersyaratan: false, statusBeasiswa: 'diusulkan', statusKuliah: 'diterima' },
      { nama: 'Fitriani Anggraini', asalSekolah: 'SMAN 1 Waringinkurug', prodi: 'D4 - Bisnis Digital', noTelepon: '081234561008', skemaPembiayaan: 'beasiswa', formulirPendaftaran: true, lulusTesMasuk: true, akunBeasiswa: false, kelengkapanPersyaratan: false, statusBeasiswa: 'diusulkan', statusKuliah: 'diterima' },
      { nama: 'Bayu Setiawan', asalSekolah: 'SMK Cibitung', prodi: 'D4 - Akuntansi Perpajakan', noTelepon: '081234561009', skemaPembiayaan: 'beasiswa', formulirPendaftaran: true, lulusTesMasuk: true, akunBeasiswa: false, kelengkapanPersyaratan: false, statusBeasiswa: 'diusulkan', statusKuliah: 'diterima' },
      { nama: 'Ayu Lestari', asalSekolah: 'SMKN 1 Pulo Ampel', prodi: 'D4 - Akuntansi Perpajakan', noTelepon: '081234561010', skemaPembiayaan: 'beasiswa', formulirPendaftaran: true, lulusTesMasuk: true, akunBeasiswa: false, kelengkapanPersyaratan: false, statusBeasiswa: 'diusulkan', statusKuliah: 'diterima' },
      { nama: 'Hendra Gunawan', asalSekolah: 'SMK BCA Cilegon', prodi: 'D4 - Akuntansi Perpajakan', noTelepon: '081234561011', skemaPembiayaan: 'beasiswa', formulirPendaftaran: true, lulusTesMasuk: true, akunBeasiswa: true, kelengkapanPersyaratan: false, statusBeasiswa: 'diusulkan', statusKuliah: 'diterima' },
      { nama: 'Devi Anjani', asalSekolah: 'SMA Negeri 2 Serang', prodi: 'D4 - Rekayasa Keamanan Siber', noTelepon: '081234561012', skemaPembiayaan: 'beasiswa', formulirPendaftaran: true, lulusTesMasuk: false, akunBeasiswa: false, kelengkapanPersyaratan: false, statusBeasiswa: 'ditolak', statusKuliah: 'ditolak' },
      { nama: 'Fajar Nugroho', asalSekolah: 'SMK Prima Global', prodi: 'D4 - Bisnis Digital', noTelepon: '081234561013', skemaPembiayaan: 'mandiri', formulirPendaftaran: true, lulusTesMasuk: true, akunBeasiswa: null, kelengkapanPersyaratan: true, statusBeasiswa: null, statusKuliah: 'menunggu' },
      { nama: 'Salsabila Rahma', asalSekolah: 'MA Al-Hikmah Serang', prodi: 'D4 - Akuntansi Perpajakan', noTelepon: '081234561014', skemaPembiayaan: 'beasiswa', formulirPendaftaran: true, lulusTesMasuk: true, akunBeasiswa: true, kelengkapanPersyaratan: true, statusBeasiswa: 'disetujui', statusKuliah: 'diterima' },
    ];

    await queryInterface.bulkInsert(
      'calon_mahasiswa',
      rows.map((r) => ({
        nama: r.nama,
        asal_sekolah: r.asalSekolah,
        prodi: r.prodi,
        no_telepon: r.noTelepon,
        skema_pembiayaan: r.skemaPembiayaan,
        formulir_pendaftaran: r.formulirPendaftaran,
        lulus_tes_masuk: r.lulusTesMasuk,
        akun_beasiswa: r.akunBeasiswa,
        kelengkapan_persyaratan: r.kelengkapanPersyaratan,
        status_beasiswa: r.statusBeasiswa,
        status_kuliah: r.statusKuliah,
        created_by: actorId,
        updated_by: actorId,
        created_at: now,
        updated_at: now,
      }))
    );
  },
  down: async (queryInterface) => {
    await queryInterface.bulkDelete('calon_mahasiswa', null, {});
  },
};
