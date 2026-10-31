module.exports = (sequelize, DataTypes) => {
  const Agama = sequelize.define(
    'Agama',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      kodeAgama: { type: DataTypes.STRING(10), allowNull: false },
      namaAgama: { type: DataTypes.STRING(50), allowNull: false },
      isDelete: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      createdBy: { type: DataTypes.INTEGER, allowNull: true },
      updatedBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: 'agama',
      underscored: true,
      timestamps: true,
      defaultScope: { where: { isDelete: false } },
      scopes: { withDeleted: {} },
    }
  );

  Agama.associate = (models) => {
    Agama.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    Agama.belongsTo(models.User, { foreignKey: 'updatedBy', as: 'updater' });
  };

  return Agama;
};
