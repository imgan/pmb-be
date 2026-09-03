module.exports = (sequelize, DataTypes) => {
  const SuratKeterangan = sequelize.define(
    'SuratKeterangan',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      mahasiswaId: { type: DataTypes.INTEGER, allowNull: false },
      jenisSurat: { type: DataTypes.STRING(50), allowNull: false },
      nomorSurat: { type: DataTypes.STRING(100), allowNull: true },
      tanggalInput: { type: DataTypes.DATEONLY, allowNull: false },
      semester: { type: DataTypes.INTEGER, allowNull: true },
      alasan: { type: DataTypes.TEXT, allowNull: true },
      namaInstansi: { type: DataTypes.STRING(255), allowNull: true },
      alamatInstansi: { type: DataTypes.TEXT, allowNull: true },
      ipk: { type: DataTypes.DECIMAL(4, 2), allowNull: true },
      jumlahSks: { type: DataTypes.INTEGER, allowNull: true },
      namaKoordinator: { type: DataTypes.STRING(150), allowNull: true },
      noHpKoordinator: { type: DataTypes.STRING(30), allowNull: true },
      tanggalUjianMulai: { type: DataTypes.DATEONLY, allowNull: true },
      tanggalUjianSelesai: { type: DataTypes.DATEONLY, allowNull: true },
      status: {
        type: DataTypes.ENUM('DIAJUKAN', 'DISETUJUI', 'DITOLAK'),
        allowNull: false,
        defaultValue: 'DISETUJUI',
      },
      createdBy: { type: DataTypes.INTEGER, allowNull: true },
      updatedBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: 'surat_keterangan',
      underscored: true,
      timestamps: true,
    }
  );

  SuratKeterangan.associate = (models) => {
    SuratKeterangan.belongsTo(models.Mahasiswa, { foreignKey: 'mahasiswaId', as: 'mahasiswa' });
    SuratKeterangan.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    SuratKeterangan.belongsTo(models.User, { foreignKey: 'updatedBy', as: 'updater' });
  };

  return SuratKeterangan;
};
