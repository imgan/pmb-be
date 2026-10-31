module.exports = (sequelize, DataTypes) => {
  const KonversiKurikulum = sequelize.define(
    'KonversiKurikulum',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      // Mata kuliah kurikulum lama → padanannya di kurikulum baru.
      dariMataKuliahId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
      keMataKuliahId: { type: DataTypes.INTEGER, allowNull: true },
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
    KonversiKurikulum.belongsTo(models.MataKuliah, { foreignKey: 'dariMataKuliahId', as: 'dariMataKuliah' });
    KonversiKurikulum.belongsTo(models.MataKuliah, { foreignKey: 'keMataKuliahId', as: 'keMataKuliah' });
    KonversiKurikulum.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    KonversiKurikulum.belongsTo(models.User, { foreignKey: 'updatedBy', as: 'updater' });
  };

  return KonversiKurikulum;
};
