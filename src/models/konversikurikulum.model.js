module.exports = (sequelize, DataTypes) => {
  const KonversiKurikulum = sequelize.define(
    'KonversiKurikulum',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      dariKurikulumId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
      keKurikulumId: { type: DataTypes.INTEGER, allowNull: true },
      createdBy: { type: DataTypes.INTEGER, allowNull: true },
      updatedBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: 'konversi_kurikulum',
      underscored: true,
      timestamps: true,
    }
  );

  KonversiKurikulum.associate = (models) => {
    KonversiKurikulum.belongsTo(models.Kurikulum, { foreignKey: 'dariKurikulumId', as: 'dariKurikulum' });
    KonversiKurikulum.belongsTo(models.Kurikulum, { foreignKey: 'keKurikulumId', as: 'keKurikulum' });
    KonversiKurikulum.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    KonversiKurikulum.belongsTo(models.User, { foreignKey: 'updatedBy', as: 'updater' });
  };

  return KonversiKurikulum;
};
