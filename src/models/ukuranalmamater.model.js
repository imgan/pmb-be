module.exports = (sequelize, DataTypes) => {
  const UkuranAlmamater = sequelize.define(
    'UkuranAlmamater',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      ukuran: { type: DataTypes.STRING(50), allowNull: false },
      createdBy: { type: DataTypes.INTEGER, allowNull: true },
      updatedBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: 'ukuran_almamater',
      underscored: true,
      timestamps: true,
    }
  );

  UkuranAlmamater.associate = (models) => {
    UkuranAlmamater.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    UkuranAlmamater.belongsTo(models.User, { foreignKey: 'updatedBy', as: 'updater' });
  };

  return UkuranAlmamater;
};
