// Pemetaan CPMK → CPL/IK (yang dibebankan ke mata kuliah CPMK tsb).
module.exports = (sequelize, DataTypes) => {
  const CpmkCpl = sequelize.define(
    'CpmkCpl',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      cpmkId: { type: DataTypes.INTEGER, allowNull: false },
      cplId: { type: DataTypes.INTEGER, allowNull: false },
      // Persen kontribusi sel CPMK → CPL; total seluruh sel satu mata kuliah = 100.
      bobot: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0,
        get() {
          return Number(this.getDataValue('bobot') ?? 0);
        },
      },
    },
    { tableName: 'cpmk_cpl', underscored: true, timestamps: true }
  );

  CpmkCpl.associate = (models) => {
    CpmkCpl.belongsTo(models.Cpmk, { foreignKey: 'cpmkId', as: 'cpmk' });
    CpmkCpl.belongsTo(models.Cpl, { foreignKey: 'cplId', as: 'cpl' });
  };

  return CpmkCpl;
};
