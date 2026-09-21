/**
 * One-off maintenance script (NOT a permanent import feature):
 *  1) Update master Jurusan.kodeProdi to match the codes used in the legacy Excel export.
 *  2) Wipe all existing Mahasiswa/Peserta/PMB + related academic transactional data (dummy/dev
 *     seed data at time of writing — confirmed with the user before running).
 *  3) Re-create Mahasiswa + MahasiswaBiodata from docs/seluruh data mahasiswa dan Akademik.xlsx
 *     (sheet "Mahasiswa"), using the same column layout as the PDDikti-style biodata
 *     import/export built in mahasiswa.service.js.
 *
 * Run with: node scripts/wipe-and-import-mahasiswa.js
 */
const path = require('path');
const ExcelJS = require('exceljs');
const { sequelize, Jurusan, Mahasiswa, MahasiswaBiodata } = require('../src/models');

const EXCEL_PATH = path.join(__dirname, '..', '..', 'docs', 'seluruh data mahasiswa dan Akademik.xlsx');

// Kode Prodi (Excel) -> nama Jurusan yang sudah ada di master (dikonfirmasi user).
const KODE_PRODI_TO_JURUSAN_NAMA = {
  '48401': 'D3 Farmasi',
  '55201': 'D3 Farmasi', // 1 baris "nyasar", diminta user dianggap Farmasi juga
  '90346': 'D4 Teknologi Rekayasa Multimedia',
  '13461': 'D3 Administrasi Rumah Sakit',
  '63414': 'D3 Manajemen Logistik',
};

const cellString = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object' && 'text' in value) return String(value.text).trim();
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
};

const cellDate = (value) => {
  const str = cellString(value);
  return str || null;
};

const cellNumber = (value) => {
  const cleaned = cellString(value).replace(/[^0-9-]/g, '');
  if (!cleaned) return null;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
};

/** Kode Prodi ("48401" dst) yang nyasar masuk kolom NIM — baris rusak, dilewati. */
const looksLikeStrayKodeProdi = (nim) => Object.prototype.hasOwnProperty.call(KODE_PRODI_TO_JURUSAN_NAMA, nim);

/**
 * Dua format NIM ditemukan di file sumber ini:
 *   A) 2 digit tahun di depan, mis. "2301111110385" -> 2023
 *   B) kodeProdi + 2 digit tahun + urutan, mis. "13461" + "24" + "10001" -> 2024
 * (dikonfirmasi lewat pengecekan manual data — semua baris yang tidak punya "Mulai semester"
 * / "Tgl Masuk Kuliah" cocok pola B).
 */
const resolveTahunMasuk = (mulaiSemester, tglMasukKuliah, nim, kodeProdi) => {
  const mulaiSem = cellNumber(mulaiSemester);
  if (mulaiSem && mulaiSem >= 2010 && mulaiSem <= 2030) return mulaiSem;

  const tgl = cellDate(tglMasukKuliah);
  if (tgl) {
    const year = Number(tgl.slice(0, 4));
    if (year >= 2010 && year <= 2030) return year;
  }

  const nimStr = String(nim);
  if (kodeProdi && nimStr.startsWith(kodeProdi)) {
    const yearPart = Number(nimStr.slice(kodeProdi.length, kodeProdi.length + 2));
    if (Number.isInteger(yearPart) && yearPart >= 15 && yearPart <= 26) return 2000 + yearPart;
  }

  const prefix = Number(nimStr.slice(0, 2));
  if (Number.isInteger(prefix) && prefix >= 15 && prefix <= 26) return 2000 + prefix;

  return null; // caller reports as error row — tidak menebak sembarangan.
};

const wipeData = async () => {
  console.log('Menonaktifkan FK checks & menghapus data mahasiswa/PMB/akademik lama...');
  await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
  const tables = [
    'bimbingan_magang',
    'daftar_potongan',
    'kehadiran_mahasiswa',
    'keringanan',
    'krs_detail',
    'krs',
    'mahasiswa_biodata',
    'nilai_mahasiswa',
    'pembayaran_lain',
    'pembayaran_sertifikasi',
    'pembayaran_sp',
    'pembayaran_ta_skripsi',
    'pembayaran_wisuda',
    'pendaftar_sidang',
    'perpanjangan_ta_skripsi',
    'surat_keterangan',
    'pembayaran_kuliah',
    'tagihan_kuliah',
    'tunggakan_mahasiswa',
    'yudisium',
    'mahasiswa',
    'calon_mahasiswa',
    'peserta_biodata',
    'peserta_dokumen',
    'peserta',
  ];
  for (const table of tables) {
    const [result] = await sequelize.query(`DELETE FROM \`${table}\``);
    console.log(`  - ${table}: ${result.affectedRows ?? 0} baris dihapus`);
  }
  await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
};

const updateJurusanKodeProdi = async () => {
  console.log('Update kode_prodi master Jurusan...');
  const namaToKode = {
    'D3 Farmasi': '48401',
    'D4 Teknologi Rekayasa Multimedia': '90346',
    'D3 Administrasi Rumah Sakit': '13461',
    'D3 Manajemen Logistik': '63414',
  };
  for (const [nama, kode] of Object.entries(namaToKode)) {
    const [count] = await Jurusan.update({ kodeProdi: kode }, { where: { namaJurusan: nama } });
    console.log(`  - ${nama} -> kodeProdi ${kode} (${count} baris)`);
  }
};

const REGULER_JURUSAN_BY_NAMA = {}; // diisi saat runtime dari DB (id golongan_kelas Reguler per prodi)

const importMahasiswa = async () => {
  console.log('Membaca Excel...');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(EXCEL_PATH);
  const ws = wb.getWorksheet('Mahasiswa');
  // Beberapa header di file sumber punya trailing non-breaking space ( ) alih-alih
  // spasi biasa — normalisasi dulu supaya pencarian kolom tidak meleset silently.
  const normalize = (s) => (typeof s === 'string' ? s.replace(/ /g, ' ').trim() : s);
  const header = ws.getRow(1).values.map(normalize);
  const col = (name) => header.indexOf(normalize(name));

  const idx = {
    nim: col('NIM'),
    nama: col('Nama'),
    tempatLahir: col('Tempat Lahir'),
    tanggalLahir: col('Tanggal Lahir'),
    jenisKelamin: col('Jenis Kelamin'),
    nik: col('NIK'),
    agama: col('Agama'),
    nisn: col('NISN'),
    jalurPendaftaran: col('Jalur Pendaftaran'),
    npwp: col('NPWP'),
    kewarganegaraan: col('Kewarganegaraan'),
    jenisPendaftaran: col('Jenis Pendaftaran'),
    tglMasukKuliah: col('Tgl Masuk Kuliah'),
    mulaiSemester: col('Mulai semester'),
    jalan: col('Jalan'),
    rt: col('RT'),
    rw: col('RW'),
    dusun: col('Nama Dusun'),
    kelurahan: col('Kelurahan'),
    kecamatan: col('Kecamatan'),
    kodePos: col('Kode Pos'),
    jenisTinggal: col('Jenis Tinggal'),
    alatTransportasi: col('Alat Transportasi'),
    teleponRumah: col('Telp Rumah'),
    hp: col('No HP'),
    email: col('Email'),
    terimaKps: col('Terima KPS'),
    noKps: col('No KPS'),
    nikAyah: col('NIK Ayah'),
    namaAyah: col('Nama Ayah'),
    tglLahirAyah: col('Tgl Lahir Ayah'),
    pendidikanAyah: col('Pendidikan Ayah'),
    pekerjaanAyah: col('Pekerjaan Ayah'),
    penghasilanAyah: col('Penghasilan Ayah'),
    nikIbu: col('NIK Ibu'),
    namaIbu: col('Nama Ibu'),
    tglLahirIbu: col('Tanggal Lahir Ibu'),
    pendidikanIbu: col('Pendidikan Ibu'),
    pekerjaanIbu: col('Pekerjaan Ibu'),
    penghasilanIbu: col('Penghasilan Ibu'),
    namaWali: col('Nama Wali'),
    tglLahirWali: col('Tanggal Lahir wali'),
    pendidikanWali: col('Pendidikan Wali'),
    pekerjaanWali: col('Pekerjaan Wali'),
    penghasilanWali: col('Penghasilan Wali'),
    kodeProdi: col('Kode Prodi'),
    jenisPembiayaan: col('Jenis Pembiayaan'),
    biayaMasuk: col('Jumlah Biaya Masuk'),
    sksDiakui: col('SKS Diakui'),
    ptAsal: col('Asal Perguruan Tinggi'),
    prodiAsal: col('Asal Program Studi'),
  };

  const jurusanRows = await Jurusan.findAll({ where: { golonganKelasId: 1 } });
  const jurusanByNama = new Map(jurusanRows.map((j) => [j.namaJurusan, j]));

  const errors = [];
  let successCount = 0;
  const usedNim = new Set();
  const urutanCounter = new Map(); // key: jurusanId|tahunMasuk

  const rows = [];
  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    rows.push({ rowNumber, values: row.values });
  });

  for (const { rowNumber, values: v } of rows) {
    const nim = cellString(v[idx.nim]);
    const nama = cellString(v[idx.nama]);

    if (!nim || !nama) {
      errors.push({ row: rowNumber, message: 'NIM atau Nama kosong' });
      continue;
    }
    if (looksLikeStrayKodeProdi(nim)) {
      errors.push({ row: rowNumber, message: `Baris rusak — kolom NIM berisi Kode Prodi ("${nim}"), bukan NIM asli` });
      continue;
    }
    if (usedNim.has(nim)) {
      errors.push({ row: rowNumber, message: `NIM "${nim}" duplikat di file, baris dilewati` });
      continue;
    }

    const kodeProdi = cellString(v[idx.kodeProdi]);
    const namaJurusan = KODE_PRODI_TO_JURUSAN_NAMA[kodeProdi];
    if (!namaJurusan) {
      errors.push({ row: rowNumber, message: `Kode Prodi "${kodeProdi}" tidak dikenali (NIM ${nim})` });
      continue;
    }
    const jurusan = jurusanByNama.get(namaJurusan);
    if (!jurusan) {
      errors.push({ row: rowNumber, message: `Jurusan "${namaJurusan}" (Reguler) tidak ditemukan di master` });
      continue;
    }

    const tahunMasuk = resolveTahunMasuk(v[idx.mulaiSemester], v[idx.tglMasukKuliah], nim, kodeProdi);
    if (!tahunMasuk) {
      errors.push({ row: rowNumber, message: `Tidak bisa menentukan Tahun Masuk untuk NIM ${nim}` });
      continue;
    }

    const emailRaw = cellString(v[idx.email]);
    const email = emailRaw && emailRaw.includes('@') ? emailRaw : `${nim}@mahasiswa.local`;

    const jenisKelaminRaw = cellString(v[idx.jenisKelamin]).toUpperCase();
    const jenisKelamin = ['L', 'P'].includes(jenisKelaminRaw) ? jenisKelaminRaw : null;

    const urutanKey = `${jurusan.id}|${tahunMasuk}`;
    const urutan = (urutanCounter.get(urutanKey) ?? 0) + 1;
    urutanCounter.set(urutanKey, urutan);

    try {
      const mahasiswa = await Mahasiswa.create({
        nim,
        pesertaId: null,
        namaLengkap: nama,
        email,
        noTelepon: cellString(v[idx.hp]) || null,
        asalSekolah: null,
        golonganKelasId: jurusan.golonganKelasId,
        jurusanId: jurusan.id,
        tahunMasuk,
        urutan,
        statusMasuk: 'BARU',
        isActive: true,
      });

      await MahasiswaBiodata.create({
        mahasiswaId: mahasiswa.id,
        tempatLahir: cellString(v[idx.tempatLahir]) || null,
        tanggalLahir: cellDate(v[idx.tanggalLahir]),
        jenisKelamin,
        agama: cellString(v[idx.agama]) || null,
        kewarganegaraan: cellString(v[idx.kewarganegaraan]) || null,
        noKtp: cellString(v[idx.nik]) || null,
        nisn: cellString(v[idx.nisn]) || null,
        jalurPendaftaran: cellString(v[idx.jalurPendaftaran]) || null,
        npwp: cellString(v[idx.npwp]) || null,
        jenisPendaftaran: cellString(v[idx.jenisPendaftaran]) || null,
        tanggalMasukKuliah: cellDate(v[idx.tglMasukKuliah]),
        mulaiSemester: cellString(v[idx.mulaiSemester]) || null,
        jalan: cellString(v[idx.jalan]) || null,
        rt: cellString(v[idx.rt]) || null,
        rw: cellString(v[idx.rw]) || null,
        dusun: cellString(v[idx.dusun]) || null,
        kelurahan: cellString(v[idx.kelurahan]) || null,
        kecamatan: cellString(v[idx.kecamatan]) || null,
        kodePos: cellString(v[idx.kodePos]) || null,
        jenisTinggal: cellString(v[idx.jenisTinggal]) || null,
        alatTransportasi: cellString(v[idx.alatTransportasi]) || null,
        teleponRumah: cellString(v[idx.teleponRumah]) || null,
        hp: cellString(v[idx.hp]) || null,
        email: emailRaw || null,
        terimaKps: cellString(v[idx.terimaKps]) || null,
        noKps: cellString(v[idx.noKps]) || null,
        nikAyah: cellString(v[idx.nikAyah]) || null,
        namaAyah: cellString(v[idx.namaAyah]) || null,
        tanggalLahirAyah: cellDate(v[idx.tglLahirAyah]),
        pendidikanAyah: cellString(v[idx.pendidikanAyah]) || null,
        pekerjaanAyah: cellString(v[idx.pekerjaanAyah]) || null,
        penghasilanAyah: cellString(v[idx.penghasilanAyah]) || null,
        nikIbu: cellString(v[idx.nikIbu]) || null,
        namaIbu: cellString(v[idx.namaIbu]) || null,
        tanggalLahirIbu: cellDate(v[idx.tglLahirIbu]),
        pendidikanIbu: cellString(v[idx.pendidikanIbu]) || null,
        pekerjaanIbu: cellString(v[idx.pekerjaanIbu]) || null,
        penghasilanIbu: cellString(v[idx.penghasilanIbu]) || null,
        namaWali: cellString(v[idx.namaWali]) || null,
        tanggalLahirWali: cellDate(v[idx.tglLahirWali]),
        pendidikanWali: cellString(v[idx.pendidikanWali]) || null,
        pekerjaanWali: cellString(v[idx.pekerjaanWali]) || null,
        penghasilanWali: cellString(v[idx.penghasilanWali]) || null,
        jenisPembiayaan: cellString(v[idx.jenisPembiayaan]) || null,
        biayaMasuk: cellNumber(v[idx.biayaMasuk]),
        sksDiakui: cellNumber(v[idx.sksDiakui]),
        perguruanTinggiAsal: cellString(v[idx.ptAsal]) || null,
        programStudiAsal: cellString(v[idx.prodiAsal]) || null,
      });

      usedNim.add(nim);
      successCount += 1;
    } catch (err) {
      errors.push({ row: rowNumber, message: err.message });
    }
  }

  console.log(`\nImport selesai: ${successCount} berhasil, ${errors.length} gagal.`);
  if (errors.length) {
    console.log('\nDaftar baris gagal:');
    errors.forEach((e) => console.log(`  - Baris ${e.row}: ${e.message}`));
  }
};

const main = async () => {
  await updateJurusanKodeProdi();
  await wipeData();
  await importMahasiswa();
  process.exit(0);
};

main().catch((err) => {
  console.error('GAGAL:', err);
  process.exit(1);
});
