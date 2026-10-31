// Pemetaan CPL → Mata Kuliah.
module.exports = (sequelize, DataTypes) => {
  const CplMataKuliah = sequelize.define(
    'CplMataKuliah',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      cplId: { type: DataTypes.INTEGER, allowNull: false },
      mataKuliahId: { type: DataTypes.INTEGER, allowNull: false },
    },
    { tableName: 'cpl_mata_kuliah', underscored: true, timestamps: true }
  );

  CplMataKuliah.associate = (models) => {
    CplMataKuliah.belongsTo(models.Cpl, { foreignKey: 'cplId', as: 'cpl' });
    CplMataKuliah.belongsTo(models.MataKuliah, { foreignKey: 'mataKuliahId', as: 'mataKuliah' });
  };

  return CplMataKuliah;
};
