module.exports = (sequelize, DataTypes) => {
  const SumberInformasi = sequelize.define(
    'SumberInformasi',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      namaInformasi: { type: DataTypes.STRING(150), allowNull: false },
      createdBy: { type: DataTypes.INTEGER, allowNull: true },
      updatedBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: 'sumber_informasi',
      underscored: true,
      timestamps: true,
    }
  );

  SumberInformasi.associate = (models) => {
    SumberInformasi.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    SumberInformasi.belongsTo(models.User, { foreignKey: 'updatedBy', as: 'updater' });
  };

  return SumberInformasi;
};
