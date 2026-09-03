module.exports = (sequelize, DataTypes) => {
  const TarifTaSkripsi = sequelize.define(
    'TarifTaSkripsi',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      periode: { type: DataTypes.INTEGER, allowNull: false },
      jurusanId: { type: DataTypes.INTEGER, allowNull: false },
      biayaPendaftaran: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
        get() {
          const value = this.getDataValue('biayaPendaftaran');
          return value === null ? null : Number(value);
        },
      },
      biayaPerpanjangan: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
        get() {
          const value = this.getDataValue('biayaPerpanjangan');
          return value === null ? null : Number(value);
        },
      },
      isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      createdBy: { type: DataTypes.INTEGER, allowNull: true },
      updatedBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: 'tarif_ta_skripsi',
      underscored: true,
      timestamps: true,
    }
  );

  TarifTaSkripsi.associate = (models) => {
    TarifTaSkripsi.belongsTo(models.Jurusan, { foreignKey: 'jurusanId', as: 'jurusan' });
    TarifTaSkripsi.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    TarifTaSkripsi.belongsTo(models.User, { foreignKey: 'updatedBy', as: 'updater' });
  };

  return TarifTaSkripsi;
};
