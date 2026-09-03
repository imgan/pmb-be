module.exports = (sequelize, DataTypes) => {
  const Mahasiswa = sequelize.define(
    'Mahasiswa',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      nim: { type: DataTypes.STRING(30), allowNull: false, unique: true },
      pesertaId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
      namaLengkap: { type: DataTypes.STRING(150), allowNull: false },
      email: { type: DataTypes.STRING(100), allowNull: false, validate: { isEmail: true } },
      noTelepon: { type: DataTypes.STRING(20), allowNull: true },
      asalSekolah: { type: DataTypes.STRING(150), allowNull: true },
      alamat: { type: DataTypes.TEXT, allowNull: true },
      golonganKelasId: { type: DataTypes.INTEGER, allowNull: false },
      jurusanId: { type: DataTypes.INTEGER, allowNull: false },
      tahunMasuk: { type: DataTypes.INTEGER, allowNull: false },
      tahunAjaranId: { type: DataTypes.INTEGER, allowNull: true },
      pembimbingAkademikId: { type: DataTypes.INTEGER, allowNull: true },
      urutan: { type: DataTypes.INTEGER, allowNull: false },
      statusMasuk: {
        type: DataTypes.ENUM('BARU', 'TRANSFER_LUAR', 'TRANSFER_DALAM', 'TRANSFER_LUAR_KARYAWAN', 'TRANSFER_DALAM_KARYAWAN'),
        allowNull: false,
        defaultValue: 'BARU',
      },
      // Hanya relevan untuk mahasiswa transfer (statusMasuk TRANSFER_*): semester awal saat
      // transfer diterima, hasil SK penyetaraan/konversi SKS dari kampus/prodi asal — input
      // manual akademik/prodi, dipakai sebagai titik awal hitung semester berjalan, bukan hasil
      // rumus (lihat pmb-be/src/utils/hitungSemester.js).
      semesterDiakui: { type: DataTypes.INTEGER, allowNull: true },
      // Tidak ada riwayat cuti per semester di sistem ini, jadi jumlahnya input manual
      // akademik/prodi untuk dikurangkan dari hitungan semester berjalan.
      jumlahSemesterCuti: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      // Koreksi manual untuk kasus khusus per mahasiswa — kalau diisi, MENGGANTIKAN hasil
      // hitungan otomatis (hitungSemesterBerjalan), bukan ikut dihitung. Null = tetap otomatis.
      semesterOverride: { type: DataTypes.INTEGER, allowNull: true },
      isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      statusKeluar: {
        type: DataTypes.ENUM(
          'CUTI',
          'MENGUNDURKAN_DIRI',
          'DROP_OUT',
          'HABIS_MASA_STUDI',
          'MUTASI',
          'PUTUS_SEKOLAH',
          'WAFAT',
          'HILANG',
          'LAINNYA'
        ),
        allowNull: true,
      },
      tanggalKeluar: { type: DataTypes.DATEONLY, allowNull: true },
      alasanKeluar: { type: DataTypes.TEXT, allowNull: true },
      password: { type: DataTypes.STRING(255), allowNull: true },
      // `photo` (base64) dikecualikan dari defaultScope mengikuti pola user.model.js — dipakai
      // di banyak query lain (mis. list mahasiswa admin) yang tidak perlu blob base64 ikut terbawa.
      photo: { type: DataTypes.TEXT('long'), allowNull: true },
      createdBy: { type: DataTypes.INTEGER, allowNull: true },
      updatedBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: 'mahasiswa',
      underscored: true,
      timestamps: true,
      defaultScope: { attributes: { exclude: ['password', 'photo'] } },
      scopes: {
        withPassword: { attributes: { include: ['password'] } },
        withPhoto: { attributes: { include: ['photo'] } },
      },
    }
  );

  Mahasiswa.associate = (models) => {
    Mahasiswa.belongsTo(models.Peserta, { foreignKey: 'pesertaId', as: 'peserta' });
    Mahasiswa.belongsTo(models.GolonganKelas, { foreignKey: 'golonganKelasId', as: 'golonganKelas' });
    Mahasiswa.belongsTo(models.Jurusan, { foreignKey: 'jurusanId', as: 'jurusan' });
    Mahasiswa.belongsTo(models.TahunAjaran, { foreignKey: 'tahunAjaranId', as: 'tahunAjaran' });
    Mahasiswa.belongsTo(models.PembimbingAkademik, { foreignKey: 'pembimbingAkademikId', as: 'pembimbingAkademik' });
    Mahasiswa.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    Mahasiswa.belongsTo(models.User, { foreignKey: 'updatedBy', as: 'updater' });
    Mahasiswa.hasOne(models.MahasiswaBiodata, { foreignKey: 'mahasiswaId', as: 'biodata' });
    Mahasiswa.hasMany(models.NilaiMahasiswa, { foreignKey: 'mahasiswaId', as: 'nilaiList' });
  };

  return Mahasiswa;
};
