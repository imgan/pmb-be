// Nilai bobot satu CPMK pada metode / sub metode rencana evaluasi (RPS).
module.exports = (sequelize, DataTypes) => {
  const RpsEvaluasiCpmk = sequelize.define(
    'RpsEvaluasiCpmk',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      rpsEvaluasiId: { type: DataTypes.INTEGER, allowNull: false },
      cpmkId: { type: DataTypes.INTEGER, allowNull: false },
      bobot: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0,
        get() {
          return Number(this.getDataValue('bobot') ?? 0);
        },
      },
    },
    { tableName: 'rps_evaluasi_cpmk', underscored: true, timestamps: true }
  );

  RpsEvaluasiCpmk.associate = (models) => {
    RpsEvaluasiCpmk.belongsTo(models.RpsEvaluasi, { foreignKey: 'rpsEvaluasiId', as: 'evaluasi' });
    RpsEvaluasiCpmk.belongsTo(models.Cpmk, { foreignKey: 'cpmkId', as: 'cpmk' });
  };

  return RpsEvaluasiCpmk;
};
