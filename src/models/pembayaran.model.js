module.exports = (sequelize, DataTypes) => {
  const Pembayaran = sequelize.define(
    'Pembayaran',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      namaPembayaran: { type: DataTypes.STRING(150), allowNull: false },
      isBeasiswa: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      createdBy: { type: DataTypes.INTEGER, allowNull: true },
      updatedBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: 'pembayaran',
      underscored: true,
      timestamps: true,
    }
  );

  Pembayaran.associate = (models) => {
    Pembayaran.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    Pembayaran.belongsTo(models.User, { foreignKey: 'updatedBy', as: 'updater' });
  };

  return Pembayaran;
};
