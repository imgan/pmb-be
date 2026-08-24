module.exports = (sequelize, DataTypes) => {
  const Beasiswa = sequelize.define(
    'Beasiswa',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      namaBeasiswa: { type: DataTypes.STRING(150), allowNull: false },
      slug: { type: DataTypes.STRING(150), allowNull: false, unique: true },
      ringkasan: { type: DataTypes.TEXT, allowNull: true },
      konten: { type: DataTypes.TEXT('long'), allowNull: true },
      orderNumber: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      createdBy: { type: DataTypes.INTEGER, allowNull: true },
      updatedBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: 'beasiswa',
      underscored: true,
      timestamps: true,
    }
  );

  Beasiswa.associate = (models) => {
    Beasiswa.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    Beasiswa.belongsTo(models.User, { foreignKey: 'updatedBy', as: 'updater' });
  };

  return Beasiswa;
};
