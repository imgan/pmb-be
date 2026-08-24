module.exports = (sequelize, DataTypes) => {
  const MahasiswaBiodata = sequelize.define(
    'MahasiswaBiodata',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      mahasiswaId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
      tempatLahir: { type: DataTypes.STRING(100), allowNull: true },
      tanggalLahir: { type: DataTypes.DATEONLY, allowNull: true },
      agama: { type: DataTypes.STRING(50), allowNull: true },
      kewarganegaraan: { type: DataTypes.STRING(50), allowNull: true },
      noKtp: { type: DataTypes.STRING(20), allowNull: true },
      npwp: { type: DataTypes.STRING(30), allowNull: true },
      jalan: { type: DataTypes.STRING(255), allowNull: true },
      dusun: { type: DataTypes.STRING(100), allowNull: true },
      rt: { type: DataTypes.STRING(3), allowNull: true },
      rw: { type: DataTypes.STRING(3), allowNull: true },
      kelurahan: { type: DataTypes.STRING(100), allowNull: true },
      kodePos: { type: DataTypes.STRING(10), allowNull: true },
      propinsi: { type: DataTypes.STRING(100), allowNull: true },
      jenisTinggal: { type: DataTypes.STRING(50), allowNull: true },
      alatTransportasi: { type: DataTypes.STRING(50), allowNull: true },
      kelas: { type: DataTypes.STRING(20), allowNull: true },
      programStudi: { type: DataTypes.STRING(150), allowNull: true },
      waktuKuliah: { type: DataTypes.STRING(20), allowNull: true },
      statusBelajar: { type: DataTypes.STRING(20), allowNull: true },
      statusKuliah: { type: DataTypes.STRING(20), allowNull: true },
      statusDikti: { type: DataTypes.STRING(50), allowNull: true },
      email: { type: DataTypes.STRING(100), allowNull: true },
      hp: { type: DataTypes.STRING(20), allowNull: true },
      almamater: { type: DataTypes.STRING(150), allowNull: true },
      namaAyah: { type: DataTypes.STRING(150), allowNull: true },
      pekerjaanAyah: { type: DataTypes.STRING(100), allowNull: true },
      namaIbu: { type: DataTypes.STRING(150), allowNull: true },
      pekerjaanIbu: { type: DataTypes.STRING(100), allowNull: true },
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
