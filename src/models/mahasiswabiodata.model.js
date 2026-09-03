module.exports = (sequelize, DataTypes) => {
  const MahasiswaBiodata = sequelize.define(
    'MahasiswaBiodata',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      mahasiswaId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
      tempatLahir: { type: DataTypes.STRING(100), allowNull: true },
      tanggalLahir: { type: DataTypes.DATEONLY, allowNull: true },
      jenisKelamin: { type: DataTypes.ENUM('L', 'P'), allowNull: true },
      agama: { type: DataTypes.STRING(50), allowNull: true },
      kewarganegaraan: { type: DataTypes.STRING(50), allowNull: true },
      noKtp: { type: DataTypes.STRING(20), allowNull: true },
      nisn: { type: DataTypes.STRING(20), allowNull: true },
      jalurPendaftaran: { type: DataTypes.STRING(100), allowNull: true },
      npwp: { type: DataTypes.STRING(30), allowNull: true },
      jenisPendaftaran: { type: DataTypes.STRING(100), allowNull: true },
      tanggalMasukKuliah: { type: DataTypes.DATEONLY, allowNull: true },
      mulaiSemester: { type: DataTypes.STRING(20), allowNull: true },
      jalan: { type: DataTypes.STRING(255), allowNull: true },
      dusun: { type: DataTypes.STRING(100), allowNull: true },
      rt: { type: DataTypes.STRING(3), allowNull: true },
      rw: { type: DataTypes.STRING(3), allowNull: true },
      kelurahan: { type: DataTypes.STRING(100), allowNull: true },
      kecamatan: { type: DataTypes.STRING(100), allowNull: true },
      kodePos: { type: DataTypes.STRING(10), allowNull: true },
      propinsi: { type: DataTypes.STRING(100), allowNull: true },
      jenisTinggal: { type: DataTypes.STRING(50), allowNull: true },
      alatTransportasi: { type: DataTypes.STRING(50), allowNull: true },
      teleponRumah: { type: DataTypes.STRING(20), allowNull: true },
      kelas: { type: DataTypes.STRING(20), allowNull: true },
      programStudi: { type: DataTypes.STRING(150), allowNull: true },
      waktuKuliah: { type: DataTypes.STRING(20), allowNull: true },
      statusBelajar: { type: DataTypes.STRING(20), allowNull: true },
      statusKuliah: { type: DataTypes.STRING(20), allowNull: true },
      statusDikti: { type: DataTypes.STRING(50), allowNull: true },
      email: { type: DataTypes.STRING(100), allowNull: true },
      hp: { type: DataTypes.STRING(20), allowNull: true },
      almamater: { type: DataTypes.STRING(150), allowNull: true },
      terimaKps: { type: DataTypes.STRING(10), allowNull: true },
      noKps: { type: DataTypes.STRING(30), allowNull: true },
      nikAyah: { type: DataTypes.STRING(20), allowNull: true },
      namaAyah: { type: DataTypes.STRING(150), allowNull: true },
      tanggalLahirAyah: { type: DataTypes.DATEONLY, allowNull: true },
      pendidikanAyah: { type: DataTypes.STRING(50), allowNull: true },
      pekerjaanAyah: { type: DataTypes.STRING(100), allowNull: true },
      penghasilanAyah: { type: DataTypes.STRING(50), allowNull: true },
      nikIbu: { type: DataTypes.STRING(20), allowNull: true },
      namaIbu: { type: DataTypes.STRING(150), allowNull: true },
      tanggalLahirIbu: { type: DataTypes.DATEONLY, allowNull: true },
      pendidikanIbu: { type: DataTypes.STRING(50), allowNull: true },
      pekerjaanIbu: { type: DataTypes.STRING(100), allowNull: true },
      penghasilanIbu: { type: DataTypes.STRING(50), allowNull: true },
      namaWali: { type: DataTypes.STRING(150), allowNull: true },
      tanggalLahirWali: { type: DataTypes.DATEONLY, allowNull: true },
      pendidikanWali: { type: DataTypes.STRING(50), allowNull: true },
      pekerjaanWali: { type: DataTypes.STRING(100), allowNull: true },
      penghasilanWali: { type: DataTypes.STRING(50), allowNull: true },
      jenisPembiayaan: { type: DataTypes.STRING(100), allowNull: true },
      biayaMasuk: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: true,
        get() {
          const value = this.getDataValue('biayaMasuk');
          return value === null ? null : Number(value);
        },
      },
      sksDiakui: { type: DataTypes.INTEGER, allowNull: true },
      perguruanTinggiAsal: { type: DataTypes.STRING(150), allowNull: true },
      programStudiAsal: { type: DataTypes.STRING(150), allowNull: true },
    },
    {
      tableName: 'mahasiswa_biodata',
      underscored: true,
      timestamps: true,
    }
  );

  MahasiswaBiodata.associate = (models) => {
    MahasiswaBiodata.belongsTo(models.Mahasiswa, { foreignKey: 'mahasiswaId', as: 'mahasiswa' });
  };

  return MahasiswaBiodata;
};
