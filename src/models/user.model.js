module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    'User',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      roleId: { type: DataTypes.INTEGER, allowNull: false },
      name: { type: DataTypes.STRING(100), allowNull: false },
      username: { type: DataTypes.STRING(50), allowNull: false, unique: true },
      email: { type: DataTypes.STRING(100), allowNull: false, unique: true, validate: { isEmail: true } },
      password: { type: DataTypes.STRING(255), allowNull: false },
      isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      lastLoginAt: { type: DataTypes.DATE, allowNull: true },
      resetPasswordToken: { type: DataTypes.STRING(255), allowNull: true },
      resetPasswordExpires: { type: DataTypes.DATE, allowNull: true },
      photo: { type: DataTypes.TEXT('long'), allowNull: true },
      createdBy: { type: DataTypes.INTEGER, allowNull: true },
      updatedBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: 'users',
      underscored: true,
      timestamps: true,
      paranoid: true,
      // `photo` (base64) dikecualikan dari defaultScope karena User di-include sebagai creator/updater
      // di hampir semua entity lain di aplikasi ini — tanpa ini, setiap respons list/detail di seluruh
      // app akan ikut membawa foto profil base64 milik pembuat/pengubah datanya.
      defaultScope: { attributes: { exclude: ['password', 'resetPasswordToken', 'resetPasswordExpires', 'photo'] } },
      scopes: {
        withPassword: { attributes: { include: ['password'] } },
        withResetToken: { attributes: { include: ['resetPasswordToken', 'resetPasswordExpires', 'password'] } },
        withPhoto: { attributes: { include: ['photo'] } },
      },
    }
  );

  User.associate = (models) => {
    User.belongsTo(models.Role, { foreignKey: 'roleId', as: 'role' });
    User.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    User.belongsTo(models.User, { foreignKey: 'updatedBy', as: 'updater' });
  };

  return User;
};
