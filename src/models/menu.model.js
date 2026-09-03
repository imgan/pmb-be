module.exports = (sequelize, DataTypes) => {
  const Menu = sequelize.define(
    'Menu',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      parentId: { type: DataTypes.INTEGER, allowNull: true },
      name: { type: DataTypes.STRING(100), allowNull: false },
      code: { type: DataTypes.STRING(50), allowNull: false, unique: true },
      path: { type: DataTypes.STRING(150), allowNull: true },
      icon: { type: DataTypes.STRING(50), allowNull: true },
      orderNumber: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      isPublic: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      module: {
        type: DataTypes.ENUM('pmb', 'baak', 'sdi', 'prodi', 'keuangan', 'sim'),
        allowNull: false,
        defaultValue: 'pmb',
      },
      createdBy: { type: DataTypes.INTEGER, allowNull: true },
      updatedBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: 'menus',
      underscored: true,
      timestamps: true,
    }
  );

  Menu.associate = (models) => {
    Menu.hasMany(models.Menu, { foreignKey: 'parentId', as: 'children' });
    Menu.belongsTo(models.Menu, { foreignKey: 'parentId', as: 'parent' });
    Menu.hasMany(models.RoleMenuPermission, { foreignKey: 'menuId', as: 'rolePermissions' });
    Menu.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    Menu.belongsTo(models.User, { foreignKey: 'updatedBy', as: 'updater' });
  };

  return Menu;
};
