module.exports = (sequelize, DataTypes) => {
  const TarifPembimbing = sequelize.define(
    'TarifPembimbing',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      periode: { type: DataTypes.INTEGER, allowNull: false },
      jurusanId: { type: DataTypes.INTEGER, allowNull: false },
      biayaPembimbingUtama: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
        get() {
          const value = this.getDataValue('biayaPembimbingUtama');
          return value === null ? null : Number(value);
        },
      },
      biayaPembimbingPendamping: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
        get() {
          const value = this.getDataValue('biayaPembimbingPendamping');
          return value === null ? null : Number(value);
        },
      },
      biayaPembimbingAsisten: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
        get() {
          const value = this.getDataValue('biayaPembimbingAsisten');
          return value === null ? null : Number(value);
        },
      },
      biayaPembimbingTunggal: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
        get() {
          const value = this.getDataValue('biayaPembimbingTunggal');
          return value === null ? null : Number(value);
        },
      },
      isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      createdBy: { type: DataTypes.INTEGER, allowNull: true },
      updatedBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: 'tarif_pembimbing',
      underscored: true,
      timestamps: true,
    }
  );

  TarifPembimbing.associate = (models) => {
    TarifPembimbing.belongsTo(models.Jurusan, { foreignKey: 'jurusanId', as: 'jurusan' });
    TarifPembimbing.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    TarifPembimbing.belongsTo(models.User, { foreignKey: 'updatedBy', as: 'updater' });
  };

  return TarifPembimbing;
};
