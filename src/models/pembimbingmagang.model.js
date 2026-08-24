module.exports = (sequelize, DataTypes) => {
  const PembimbingMagang = sequelize.define(
    'PembimbingMagang',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      dosenId: { type: DataTypes.INTEGER, allowNull: false },
      noSk: { type: DataTypes.STRING(100), allowNull: true },
      tanggalSk: { type: DataTypes.DATEONLY, allowNull: true },
      isDelete: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      createdBy: { type: DataTypes.INTEGER, allowNull: true },
      updatedBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: 'pembimbing_magang',
      underscored: true,
      timestamps: true,
      defaultScope: { where: { isDelete: false } },
      scopes: { withDeleted: {} },
    }
  );

  PembimbingMagang.associate = (models) => {
    PembimbingMagang.belongsTo(models.Dosen, { foreignKey: 'dosenId', as: 'dosen' });
    PembimbingMagang.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    PembimbingMagang.belongsTo(models.User, { foreignKey: 'updatedBy', as: 'updater' });
  };

  return PembimbingMagang;
};
