module.exports = (sequelize, DataTypes) => {
  const Gelombang = sequelize.define(
    'Gelombang',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      namaGelombang: { type: DataTypes.STRING(150), allowNull: false },
      startDate: { type: DataTypes.DATEONLY, allowNull: false },
      endDate: { type: DataTypes.DATEONLY, allowNull: false },
      deskripsi: { type: DataTypes.TEXT, allowNull: true },
      createdBy: { type: DataTypes.INTEGER, allowNull: true },
      updatedBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: 'gelombang',
      underscored: true,
      timestamps: true,
    }
  );

  Gelombang.associate = (models) => {
    Gelombang.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    Gelombang.belongsTo(models.User, { foreignKey: 'updatedBy', as: 'updater' });
  };

  return Gelombang;
};
