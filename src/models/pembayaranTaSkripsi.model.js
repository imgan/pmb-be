module.exports = (sequelize, DataTypes) => {
  const PembayaranTaSkripsi = sequelize.define(
    'PembayaranTaSkripsi',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      mahasiswaId: { type: DataTypes.INTEGER, allowNull: false },
      periode: { type: DataTypes.INTEGER, allowNull: false },
      tanggalBayar: { type: DataTypes.DATEONLY, allowNull: false },
      noBukti: { type: DataTypes.STRING(50), allowNull: false },
      nominal: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
        get() {
          const value = this.getDataValue('nominal');
          return value === null ? null : Number(value);
        },
      },
      kodeBank: { type: DataTypes.STRING(30), allowNull: true },
      keterangan: { type: DataTypes.STRING(150), allowNull: true },
      createdBy: { type: DataTypes.INTEGER, allowNull: true },
      updatedBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: 'pembayaran_ta_skripsi',
      underscored: true,
      timestamps: true,
    }
  );

  PembayaranTaSkripsi.associate = (models) => {
    PembayaranTaSkripsi.belongsTo(models.Mahasiswa, { foreignKey: 'mahasiswaId', as: 'mahasiswa' });
    PembayaranTaSkripsi.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    PembayaranTaSkripsi.belongsTo(models.User, { foreignKey: 'updatedBy', as: 'updater' });
  };

  return PembayaranTaSkripsi;
};
