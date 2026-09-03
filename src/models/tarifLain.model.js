module.exports = (sequelize, DataTypes) => {
  const TarifLain = sequelize.define(
    'TarifLain',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      kodeBiaya: { type: DataTypes.STRING(30), allowNull: false },
      tahunMasuk: { type: DataTypes.INTEGER, allowNull: false },
      biaya: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
        get() {
          const value = this.getDataValue('biaya');
          return value === null ? null : Number(value);
        },
      },
      keterangan: { type: DataTypes.STRING(150), allowNull: true },
      isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      tahunAkademik: {
        type: DataTypes.VIRTUAL,
        get() {
          const tahunMasuk = this.getDataValue('tahunMasuk');
          return tahunMasuk ? `${tahunMasuk}/${tahunMasuk + 1}` : null;
        },
      },
      createdBy: { type: DataTypes.INTEGER, allowNull: true },
      updatedBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: 'tarif_lain',
      underscored: true,
      timestamps: true,
    }
  );

  TarifLain.associate = (models) => {
    TarifLain.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    TarifLain.belongsTo(models.User, { foreignKey: 'updatedBy', as: 'updater' });
  };

  return TarifLain;
};
