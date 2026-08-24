'use strict';

const bcrypt = require('bcryptjs');

const MATA_KULIAH = [
  { kode: '12207001', nama: 'Pengantar Manajemen dan Bisnis', sks: 3, semester: 1 },
  { kode: '12307001', nama: 'Algoritma', sks: 4, semester: 1 },
  { kode: '12307002', nama: 'Bahasa Pemrograman 1', sks: 3, semester: 1 },
  { kode: '12307003', nama: 'Pengantar Teknologi Informasi', sks: 3, semester: 1 },
  { kode: '12207002', nama: 'Akuntansi Dasar', sks: 4, semester: 2 },
  { kode: '12207003', nama: 'Konsep Sistem Informasi', sks: 4, semester: 2 },
  { kode: '12307004', nama: 'Bahasa Pemrograman 2', sks: 3, semester: 2 },
  { kode: '12307005', nama: 'Sistem Informasi Manajemen', sks: 4, semester: 2 },
  { kode: '12207004', nama: 'Aljabar Linier', sks: 3, semester: 3 },
  { kode: '12207011', nama: 'Pengantar Ekonomi', sks: 2, semester: 3 },
  { kode: '12307006', nama: 'Struktur Data', sks: 4, semester: 3 },
  { kode: '12307007', nama: 'Basis Data', sks: 4, semester: 3 },
  { kode: '12307008', nama: 'Pemrograman Web', sks: 3, semester: 4 },
  { kode: '12307009', nama: 'Jaringan Komputer', sks: 3, semester: 4 },
];

const ROMAN_MONTH = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

const clamp = (n) => Math.max(0, Math.min(100, n));
const round2 = (n) => Math.round(n * 100) / 100;

const gradeFor = (nilai) => {
  if (nilai >= 85) return 'A';
  if (nilai >= 70) return 'B';
  if (nilai >= 55) return 'C';
  if (nilai >= 40) return 'D';
  return 'E';
};

const computeNilai = ({ partisipatif, tugas, uts, uas }) =>
  round2(partisipatif * 0.1 + tugas * 0.2 + uts * 0.3 + uas * 0.4);

// tier 0 = IPK tertinggi ... tier 4 = IPK terendah, dipilih dari index mahasiswa (index % 5).
const scoresForCourse = (tier, courseIndex) => {
  const base = 90 - tier * 10;
  return {
    partisipatif: clamp(base - 5 + (courseIndex % 5)),
    tugas: clamp(base + (courseIndex % 4)),
    uts: clamp(base + 3 - (courseIndex % 3)),
    uas: clamp(base - 2 + (courseIndex % 6)),
  };
};

const nikFor = (regionCode, tanggalLahir, seq) => {
  const [, mm, dd] = tanggalLahir.split('-');
  const yy = tanggalLahir.slice(2, 4);
  return `${regionCode}${dd}${mm}${yy}${String(seq).padStart(4, '0')}`;
};

// Kelompok mahasiswa lulusan dummy, dikelompokkan per (jurusan, golongan kelas) supaya prefix NIM +
// tahun masuk tidak bentrok antar kelompok yang berbagi prefix yang sama (mis. D3ML dipakai di 3 kelompok).
const GROUPS = [
  {
    namaJurusan: 'D3 Farmasi',
    namaKelas: 'Reguler',
    prefix: 'D3FR',
    tahunMasuk: 2021,
    tanggalYudisium: '2024-09-15',
    mahasiswa: [
      { nama: 'Sarah Amelia Putri', tempatLahir: 'Jakarta', tanggalLahir: '2003-02-10', region: '317501', status: 'BARU' },
      { nama: 'Reza Maulana Hakim', tempatLahir: 'Bekasi', tanggalLahir: '2003-05-22', region: '327501', status: 'BARU' },
      { nama: 'Nadia Kusuma Wardani', tempatLahir: 'Bogor', tanggalLahir: '2002-11-30', region: '327101', status: 'TRANSFER_DALAM' },
    ],
  },
  {
    namaJurusan: 'D3 Manajemen Logistik',
    namaKelas: 'Reguler',
    prefix: 'D3ML',
    tahunMasuk: 2021,
    tanggalYudisium: '2024-09-20',
    mahasiswa: [
      { nama: 'Aditya Rahman Saputra', tempatLahir: 'Depok', tanggalLahir: '2003-01-18', region: '327601', status: 'BARU' },
      { nama: 'Clara Amanda Salsabila', tempatLahir: 'Jakarta', tanggalLahir: '2003-08-04', region: '317501', status: 'BARU' },
      { nama: 'Fajar Nugroho Wibowo', tempatLahir: 'Bekasi', tanggalLahir: '2002-12-27', region: '327501', status: 'BARU' },
    ],
  },
  {
    namaJurusan: 'D3 Administrasi Rumah Sakit',
    namaKelas: 'Reguler',
    prefix: 'D3AR',
    tahunMasuk: 2020,
    tanggalYudisium: '2023-09-10',
    mahasiswa: [
      { nama: 'Intan Permata Sari', tempatLahir: 'Bandung', tanggalLahir: '2002-04-09', region: '327301', status: 'BARU' },
      { nama: 'Muhammad Fikri Ramadhan', tempatLahir: 'Karawang', tanggalLahir: '2002-06-15', region: '321501', status: 'BARU' },
      { nama: 'Dinda Ayu Lestari', tempatLahir: 'Bekasi', tanggalLahir: '2001-10-03', region: '327501', status: 'TRANSFER_LUAR' },
    ],
  },
  {
    namaJurusan: 'D4 Teknologi Rekayasa Multimedia',
    namaKelas: 'Reguler',
    prefix: 'D4TR',
    tahunMasuk: 2020,
    tanggalYudisium: '2024-09-25',
    mahasiswa: [
      { nama: 'Bima Satria Nugraha', tempatLahir: 'Tangerang', tanggalLahir: '2002-03-21', region: '367101', status: 'BARU' },
      { nama: 'Keisha Ardelia Putri', tempatLahir: 'Jakarta', tanggalLahir: '2002-07-13', region: '317501', status: 'BARU' },
      { nama: 'Yoga Pratama Setiawan', tempatLahir: 'Bogor', tanggalLahir: '2001-09-28', region: '327101', status: 'TRANSFER_DALAM' },
    ],
  },
  {
    namaJurusan: 'D3 Manajemen Logistik',
    namaKelas: 'Karyawan',
    prefix: 'D3ML',
    tahunMasuk: 2022,
    tanggalYudisium: '2025-09-12',
    mahasiswa: [
      { nama: 'Wahyu Setiadi Nugraha', tempatLahir: 'Serang', tanggalLahir: '1998-05-17', region: '367201', status: 'BARU' },
      { nama: 'Ratna Juwita Handayani', tempatLahir: 'Cirebon', tanggalLahir: '1999-02-25', region: '320901', status: 'BARU' },
    ],
  },
  {
    namaJurusan: 'D3 Administrasi Rumah Sakit',
    namaKelas: 'Karyawan',
    prefix: 'D3AR',
    tahunMasuk: 2021,
    tanggalYudisium: '2024-09-18',
    mahasiswa: [
      { nama: 'Yulia Anggraeni Putri', tempatLahir: 'Sukabumi', tanggalLahir: '1999-08-30', region: '320201', status: 'BARU' },
      { nama: 'Doni Firmansyah', tempatLahir: 'Cianjur', tanggalLahir: '1998-12-11', region: '320301', status: 'TRANSFER_DALAM' },
    ],
  },
  {
    namaJurusan: 'D3 Manajemen Logistik',
    namaKelas: 'Kelas Malam',
    prefix: 'D3ML',
    tahunMasuk: 2023,
    tanggalYudisium: '2026-02-20',
    mahasiswa: [
      { nama: 'Hendra Kurniawan', tempatLahir: 'Bekasi', tanggalLahir: '2000-01-06', region: '327501', status: 'BARU' },
      { nama: 'Siti Maharani', tempatLahir: 'Jakarta', tanggalLahir: '2000-06-19', region: '317501', status: 'BARU' },
    ],
  },
  {
    namaJurusan: 'D4 Teknologi Rekayasa Multimedia',
    namaKelas: 'Kelas Malam',
    prefix: 'D4TR',
    tahunMasuk: 2019,
    tanggalYudisium: '2023-09-05',
    mahasiswa: [
      { nama: 'Galih Prasetyo', tempatLahir: 'Depok', tanggalLahir: '1999-04-14', region: '327601', status: 'BARU' },
      { nama: 'Anisa Rahmawati', tempatLahir: 'Bogor', tanggalLahir: '1999-10-02', region: '327101', status: 'TRANSFER_LUAR' },
    ],
  },
];

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();

    const [users] = await queryInterface.sequelize.query("SELECT id FROM users WHERE username = 'superadmin' LIMIT 1");
    const actorId = users.length ? users[0].id : null;
    const [dosenList] = await queryInterface.sequelize.query('SELECT id FROM dosen ORDER BY id ASC LIMIT 4');

    // Bail out if this seeder already ran (idempotency guard, sama seperti seeder dummy lain).
    const [already] = await queryInterface.sequelize.query("SELECT id FROM peserta WHERE email = 'lulusan01@example.com' LIMIT 1");
    if (already.length > 0) return;

    let globalIndex = 0;
    const pesertaRows = [];
    const hashedPassword = await bcrypt.hash('Password123!', 10);

    // Resolve tiap (jurusan, golongan kelas) pair terlebih dahulu.
    const groupRefs = [];
    for (const group of GROUPS) {
      const [rows] = await queryInterface.sequelize.query(
        `SELECT j.id AS jurusanId, j.golongan_kelas_id AS golonganKelasId
         FROM jurusan j
         INNER JOIN golongan_kelas gk ON gk.id = j.golongan_kelas_id
         WHERE gk.nama_kelas = :namaKelas AND j.nama_jurusan = :namaJurusan
         LIMIT 1`,
        { replacements: { namaKelas: group.namaKelas, namaJurusan: group.namaJurusan } }
      );
      if (!rows.length) continue;
      groupRefs.push({ group, jurusanId: rows[0].jurusanId, golonganKelasId: rows[0].golonganKelasId });
    }

    groupRefs.forEach(({ group, jurusanId, golonganKelasId }) => {
      group.mahasiswa.forEach((mhs, i) => {
        globalIndex += 1;
        pesertaRows.push({
          seq: globalIndex,
          urutan: i + 1,
          namaLengkap: mhs.nama,
          asalSekolah: 'SMA Negeri 1 ' + mhs.tempatLahir,
          golonganKelasId,
          jurusanId,
          tempatLahir: mhs.tempatLahir,
          tanggalLahir: mhs.tanggalLahir,
          region: mhs.region,
          status: mhs.status,
          tahunMasuk: group.tahunMasuk,
          prefix: group.prefix,
          tanggalYudisium: group.tanggalYudisium,
        });
      });
    });

    if (!pesertaRows.length) return;

    // 1) Peserta
    await queryInterface.bulkInsert(
      'peserta',
      pesertaRows.map((p) => ({
        nama_lengkap: p.namaLengkap,
        asal_sekolah: p.asalSekolah,
        golongan_kelas_id: p.golonganKelasId,
        jurusan_id: p.jurusanId,
        no_telepon: `0812${String(30000000 + p.seq)}`,
        email: `lulusan${String(p.seq).padStart(2, '0')}@example.com`,
        password: hashedPassword,
        status_ujian: 'lulus',
        status_kelulusan: 'diterima',
        created_by: actorId,
        updated_by: actorId,
        created_at: now,
        updated_at: now,
      }))
    );

    const [pesertaInserted] = await queryInterface.sequelize.query(
      `SELECT id, email FROM peserta WHERE email IN (${pesertaRows
        .map((p) => `'lulusan${String(p.seq).padStart(2, '0')}@example.com'`)
        .join(',')})`
    );
    const pesertaIdBySeq = {};
    pesertaInserted.forEach((row) => {
      const seq = Number(row.email.replace('lulusan', '').replace('@example.com', ''));
      pesertaIdBySeq[seq] = row.id;
    });

    // 2) Mahasiswa (nim mengikuti pola prefix+tahunMasuk+urutan yang sudah dipakai di alur daftar ulang)
    await queryInterface.bulkInsert(
      'mahasiswa',
      pesertaRows.map((p) => ({
        nim: `${p.prefix}${p.tahunMasuk}${String(p.urutan).padStart(4, '0')}`,
        peserta_id: pesertaIdBySeq[p.seq],
        nama_lengkap: p.namaLengkap,
        email: `lulusan${String(p.seq).padStart(2, '0')}@example.com`,
        no_telepon: `0812${String(30000000 + p.seq)}`,
        asal_sekolah: p.asalSekolah,
        golongan_kelas_id: p.golonganKelasId,
        jurusan_id: p.jurusanId,
        tahun_masuk: p.tahunMasuk,
        urutan: p.urutan,
        status_masuk: p.status,
        is_active: true,
        created_by: actorId,
        updated_by: actorId,
        created_at: now,
        updated_at: now,
      }))
    );

    const [mahasiswaInserted] = await queryInterface.sequelize.query(
      `SELECT id, nim FROM mahasiswa WHERE nim IN (${pesertaRows
        .map((p) => `'${p.prefix}${p.tahunMasuk}${String(p.urutan).padStart(4, '0')}'`)
        .join(',')})`
    );
    const mahasiswaIdBySeq = {};
    pesertaRows.forEach((p) => {
      const nim = `${p.prefix}${p.tahunMasuk}${String(p.urutan).padStart(4, '0')}`;
      const found = mahasiswaInserted.find((row) => row.nim === nim);
      if (found) mahasiswaIdBySeq[p.seq] = found.id;
    });

    // 3) MahasiswaBiodata
    await queryInterface.bulkInsert(
      'mahasiswa_biodata',
      pesertaRows.map((p) => ({
        mahasiswa_id: mahasiswaIdBySeq[p.seq],
        tempat_lahir: p.tempatLahir,
        tanggal_lahir: p.tanggalLahir,
        no_ktp: nikFor(p.region, p.tanggalLahir, p.seq),
        kewarganegaraan: 'Indonesia',
        created_at: now,
        updated_at: now,
      }))
    );

    // 4) NilaiMahasiswa (14 mata kuliah per mahasiswa, tier nilai bervariasi per index)
    const nilaiRows = [];
    pesertaRows.forEach((p, idx) => {
      const tier = idx % 5;
      MATA_KULIAH.forEach((mk, courseIndex) => {
        const scores = scoresForCourse(tier, courseIndex);
        const nilai = computeNilai(scores);
        nilaiRows.push({
          mahasiswa_id: mahasiswaIdBySeq[p.seq],
          kode_mata_kuliah: mk.kode,
          nama_mata_kuliah: mk.nama,
          sks: mk.sks,
          semester: mk.semester,
          partisipatif: scores.partisipatif,
          proyek: 0,
          quiz: 0,
          tugas: scores.tugas,
          uts: scores.uts,
          uas: scores.uas,
          nilai,
          grade: gradeFor(nilai),
          created_at: now,
          updated_at: now,
        });
      });
    });
    await queryInterface.bulkInsert('nilai_mahasiswa', nilaiRows);

    // 5) Yudisium
    await queryInterface.bulkInsert(
      'yudisium',
      pesertaRows.map((p, idx) => {
        const yudisiumDate = new Date(p.tanggalYudisium);
        const day = String(yudisiumDate.getDate() + (p.urutan - 1)).padStart(2, '0');
        const month = ROMAN_MONTH[yudisiumDate.getMonth()];
        const year = yudisiumDate.getFullYear();
        return {
          mahasiswa_id: mahasiswaIdBySeq[p.seq],
          no_sk: `${String(100 + p.seq)}/SK/DIR-PBK/${month}/${year}`,
          tanggal_sk: p.tanggalYudisium,
          tanggal_yudisium: `${year}-${String(yudisiumDate.getMonth() + 1).padStart(2, '0')}-${day}`,
          pin: `0411${p.tahunMasuk}${String(p.seq).padStart(4, '0')}`,
          judul: 'Laporan Tugas Akhir Program Studi',
          pembimbing1_id: dosenList[idx % dosenList.length]?.id ?? null,
          pembimbing2_id: dosenList[(idx + 1) % dosenList.length]?.id ?? null,
          created_by: actorId,
          updated_by: actorId,
          created_at: now,
          updated_at: now,
        };
      })
    );
  },

  down: async (queryInterface) => {
    const emails = [];
    for (let i = 1; i <= 20; i += 1) {
      emails.push(`'lulusan${String(i).padStart(2, '0')}@example.com'`);
    }
    const [pesertaRows] = await queryInterface.sequelize.query(
      `SELECT id FROM peserta WHERE email IN (${emails.join(',')})`
    );
    if (!pesertaRows.length) return;
    const pesertaIds = pesertaRows.map((r) => r.id);

    const [mahasiswaRows] = await queryInterface.sequelize.query(
      `SELECT id FROM mahasiswa WHERE peserta_id IN (${pesertaIds.join(',')})`
    );
    const mahasiswaIds = mahasiswaRows.map((r) => r.id);

    if (mahasiswaIds.length) {
      await queryInterface.bulkDelete('yudisium', { mahasiswa_id: mahasiswaIds });
      await queryInterface.bulkDelete('nilai_mahasiswa', { mahasiswa_id: mahasiswaIds });
      await queryInterface.bulkDelete('mahasiswa_biodata', { mahasiswa_id: mahasiswaIds });
      await queryInterface.bulkDelete('mahasiswa', { id: mahasiswaIds });
    }
    await queryInterface.bulkDelete('peserta', { id: pesertaIds });
  },
};
