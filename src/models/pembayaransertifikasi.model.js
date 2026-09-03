module.exports = (sequelize, DataTypes) => {
  const PembayaranSertifikasi = sequelize.define(
    'PembayaranSertifikasi',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      mahasiswaId: { type: DataTypes.INTEGER, allowNull: false },
      tanggalBayar: { type: DataTypes.DATEONLY, allowNull: false },
      noBukti: { type: DataTypes.STRING(50), allowNull: false },
      jenisPembayaran: { type: DataTypes.STRING(100), allowNull: false },
      caraPembayaran: { type: DataTypes.STRING(30), allowNull: false },
      tanggalPelaksanaan: { type: DataTypes.DATEONLY, allowNull: true },
      waktuPelaksanaan: { type: DataTypes.STRING(20), allowNull: true },
      bayar: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
        get() {
          const value = this.getDataValue('bayar');
          return value === null ? null : Number(value);
        },
      },
      kodeBank: { type: DataTypes.STRING(30), allowNull: true },
      keterangan: { type: DataTypes.STRING(150), allowNull: true },
      statusSertifikasi: {
        type: DataTypes.ENUM('MENUNGGU', 'LULUS', 'TIDAK_LULUS'),
        allowNull: false,
        defaultValue: 'MENUNGGU',
      },
      buktiPembayaran: { type: DataTypes.TEXT('long'), allowNull: true },
      createdBy: { type: DataTypes.INTEGER, allowNull: true },
      updatedBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: 'pembayaran_sertifikasi',
      underscored: true,
      timestamps: true,
    }
  );

  PembayaranSertifikasi.associate = (models) => {
    PembayaranSertifikasi.belongsTo(models.Mahasiswa, { foreignKey: 'mahasiswaId', as: 'mahasiswa' });
    PembayaranSertifikasi.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    PembayaranSertifikasi.belongsTo(models.User, { foreignKey: 'updatedBy', as: 'updater' });
  };

  return PembayaranSertifikasi;
};
