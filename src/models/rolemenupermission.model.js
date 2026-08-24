module.exports = (sequelize, DataTypes) => {
  const RoleMenuPermission = sequelize.define(
    'RoleMenuPermission',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      roleId: { type: DataTypes.INTEGER, allowNull: false },
      menuId: { type: DataTypes.INTEGER, allowNull: false },
      canCreate: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      canRead: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      canUpdate: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      canDelete: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      createdBy: { type: DataTypes.INTEGER, allowNull: true },
      updatedBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: 'role_menu_permissions',
      underscored: true,
      timestamps: true,
      indexes: [{ unique: true, fields: ['role_id', 'menu_id'] }],
    }
  );

  RoleMenuPermission.associate = (models) => {
    RoleMenuPermission.belongsTo(models.Role, { foreignKey: 'roleId', as: 'role' });
    RoleMenuPermission.belongsTo(models.Menu, { foreignKey: 'menuId', as: 'menu' });
    RoleMenuPermission.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    RoleMenuPermission.belongsTo(models.User, { foreignKey: 'updatedBy', as: 'updater' });
  };

  return RoleMenuPermission;
};
