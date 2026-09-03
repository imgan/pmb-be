module.exports = (sequelize, DataTypes) => {
  const PembayaranKuliah = sequelize.define(
    'PembayaranKuliah',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      tagihanKuliahId: { type: DataTypes.INTEGER, allowNull: false },
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
      tableName: 'pembayaran_kuliah',
      underscored: true,
      timestamps: true,
    }
  );

  PembayaranKuliah.associate = (models) => {
    PembayaranKuliah.belongsTo(models.TagihanKuliah, { foreignKey: 'tagihanKuliahId', as: 'tagihan' });
    PembayaranKuliah.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    PembayaranKuliah.belongsTo(models.User, { foreignKey: 'updatedBy', as: 'updater' });
  };

  return PembayaranKuliah;
};
