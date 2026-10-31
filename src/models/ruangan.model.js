module.exports = (sequelize, DataTypes) => {
  const Ruangan = sequelize.define(
    'Ruangan',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      namaRuang: { type: DataTypes.STRING(50), allowNull: false },
      kampus: { type: DataTypes.STRING(50), allowNull: true },
      lantai: { type: DataTypes.INTEGER, allowNull: true },
      projector: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      keterangan: { type: DataTypes.STRING(255), allowNull: true },
      fungsi: { type: DataTypes.STRING(100), allowNull: true },
      kursi: { type: DataTypes.INTEGER, allowNull: true },
      isDelete: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      createdBy: { type: DataTypes.INTEGER, allowNull: true },
      updatedBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: 'ruangan',
      underscored: true,
      timestamps: true,
      defaultScope: { where: { isDelete: false } },
      scopes: { withDeleted: {} },
    }
  );

  Ruangan.associate = (models) => {
    Ruangan.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    Ruangan.belongsTo(models.User, { foreignKey: 'updatedBy', as: 'updater' });
  };

  return Ruangan;
};
