module.exports = (sequelize, DataTypes) => {
  const Role = sequelize.define(
    'Role',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: DataTypes.STRING(100), allowNull: false, unique: true },
      code: { type: DataTypes.STRING(50), allowNull: false, unique: true },
      description: { type: DataTypes.STRING(255), allowNull: true },
      isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      createdBy: { type: DataTypes.INTEGER, allowNull: true },
      updatedBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: 'roles',
      underscored: true,
      timestamps: true,
    }
  );

  Role.associate = (models) => {
    Role.hasMany(models.User, { foreignKey: 'roleId', as: 'users' });
    Role.hasMany(models.RoleMenuPermission, { foreignKey: 'roleId', as: 'permissions' });
    Role.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    Role.belongsTo(models.User, { foreignKey: 'updatedBy', as: 'updater' });
  };

  return Role;
};
