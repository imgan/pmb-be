module.exports = (sequelize, DataTypes) => {
  const PembayaranWisuda = sequelize.define(
    'PembayaranWisuda',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      mahasiswaId: { type: DataTypes.INTEGER, allowNull: false },
      tanggalBayar: { type: DataTypes.DATEONLY, allowNull: false },
      noBukti: { type: DataTypes.STRING(50), allowNull: false },
      semester: { type: DataTypes.INTEGER, allowNull: true },
      periode: { type: DataTypes.STRING(20), allowNull: false },
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
      createdBy: { type: DataTypes.INTEGER, allowNull: true },
      updatedBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: 'pembayaran_wisuda',
      underscored: true,
      timestamps: true,
    }
  );

  PembayaranWisuda.associate = (models) => {
    PembayaranWisuda.belongsTo(models.Mahasiswa, { foreignKey: 'mahasiswaId', as: 'mahasiswa' });
    PembayaranWisuda.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    PembayaranWisuda.belongsTo(models.User, { foreignKey: 'updatedBy', as: 'updater' });
  };

  return PembayaranWisuda;
};
