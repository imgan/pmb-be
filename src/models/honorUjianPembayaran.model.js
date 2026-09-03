module.exports = (sequelize, DataTypes) => {
  const HonorUjianPembayaran = sequelize.define(
    'HonorUjianPembayaran',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      dosenId: { type: DataTypes.INTEGER, allowNull: false },
      nominal: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
        get() {
          const value = this.getDataValue('nominal');
          return value === null ? null : Number(value);
        },
      },
      tanggalBayar: { type: DataTypes.DATEONLY, allowNull: false },
      createdBy: { type: DataTypes.INTEGER, allowNull: true },
      updatedBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: 'honor_ujian_pembayaran',
      underscored: true,
      timestamps: true,
    }
  );

  HonorUjianPembayaran.associate = (models) => {
    HonorUjianPembayaran.belongsTo(models.Dosen, { foreignKey: 'dosenId', as: 'dosen' });
    HonorUjianPembayaran.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    HonorUjianPembayaran.belongsTo(models.User, { foreignKey: 'updatedBy', as: 'updater' });
  };

  return HonorUjianPembayaran;
};
