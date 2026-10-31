// Pemetaan Profil Lulusan → CPL.
module.exports = (sequelize, DataTypes) => {
  const PlCpl = sequelize.define(
    'PlCpl',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      profilLulusanId: { type: DataTypes.INTEGER, allowNull: false },
      cplId: { type: DataTypes.INTEGER, allowNull: false },
      // Persen kontribusi CPL ke PL (total per PL = 100).
      bobot: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
    },
    { tableName: 'pl_cpl', underscored: true, timestamps: true }
  );

  PlCpl.associate = (models) => {
    PlCpl.belongsTo(models.ProfilLulusan, { foreignKey: 'profilLulusanId', as: 'profilLulusan' });
    PlCpl.belongsTo(models.Cpl, { foreignKey: 'cplId', as: 'cpl' });
  };

  return PlCpl;
};
