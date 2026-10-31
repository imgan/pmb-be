module.exports = (sequelize, DataTypes) => {
  const NilaiMagang = sequelize.define(
    'NilaiMagang',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      mahasiswaId: { type: DataTypes.INTEGER, allowNull: false },
      tahunAjaranId: { type: DataTypes.INTEGER, allowNull: true },
      semester: { type: DataTypes.INTEGER, allowNull: true },
      judul: { type: DataTypes.TEXT, allowNull: false },
      lokasi: { type: DataTypes.STRING(200), allowNull: false },
      alamatLokasi: { type: DataTypes.TEXT, allowNull: true },
      // Kontak perusahaan/instansi (diisi mahasiswa saat pendaftaran KKP di portal).
      emailPerusahaan: { type: DataTypes.STRING(150), allowNull: true },
      teleponPerusahaan: { type: DataTypes.STRING(30), allowNull: true },
      pembimbingLapangan: { type: DataTypes.STRING(150), allowNull: true },
      pembimbingMagangId: { type: DataTypes.INTEGER, allowNull: true },
      tanggalMulai: { type: DataTypes.DATEONLY, allowNull: true },
      tanggalSelesai: { type: DataTypes.DATEONLY, allowNull: true },
      nilai: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        get() {
          const value = this.getDataValue('nilai');
          return value === null ? null : Number(value);
        },
      },
      grade: { type: DataTypes.STRING(2), allowNull: true },
      keterangan: { type: DataTypes.TEXT, allowNull: true },
      isDelete: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      createdBy: { type: DataTypes.INTEGER, allowNull: true },
      updatedBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: 'nilai_magang',
      underscored: true,
      timestamps: true,
      defaultScope: { where: { isDelete: false } },
      scopes: { withDeleted: {} },
    }
  );

  NilaiMagang.associate = (models) => {
    NilaiMagang.belongsTo(models.Mahasiswa, { foreignKey: 'mahasiswaId', as: 'mahasiswa' });
    NilaiMagang.belongsTo(models.TahunAjaran, { foreignKey: 'tahunAjaranId', as: 'tahunAjaran' });
    NilaiMagang.belongsTo(models.PembimbingMagang, { foreignKey: 'pembimbingMagangId', as: 'pembimbingMagang' });
    NilaiMagang.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    NilaiMagang.belongsTo(models.User, { foreignKey: 'updatedBy', as: 'updater' });
  };

  return NilaiMagang;
};
