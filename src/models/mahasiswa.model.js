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
      createdBy: { type: DataTypes.INTEGER, allowNull: true },
      updatedBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: 'mahasiswa',
      underscored: true,
      timestamps: true,
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
