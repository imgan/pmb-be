module.exports = (sequelize, DataTypes) => {
  const Kampus = sequelize.define(
    'Kampus',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      namaKampus: { type: DataTypes.STRING(150), allowNull: false },
      alamat: { type: DataTypes.TEXT, allowNull: true },
      telepon: { type: DataTypes.STRING(30), allowNull: true },
      kodePos: { type: DataTypes.STRING(10), allowNull: true },
      email: { type: DataTypes.STRING(100), allowNull: true },
      whatsappNumber: { type: DataTypes.STRING(30), allowNull: true },
      facebookUrl: { type: DataTypes.STRING(255), allowNull: true },
      instagramUrl: { type: DataTypes.STRING(255), allowNull: true },
      youtubeUrl: { type: DataTypes.STRING(255), allowNull: true },
      logoUrl: { type: DataTypes.TEXT('long'), allowNull: true },
      faviconUrl: { type: DataTypes.TEXT('long'), allowNull: true },
      websiteTitle: { type: DataTypes.STRING(150), allowNull: true },
      createdBy: { type: DataTypes.INTEGER, allowNull: true },
      updatedBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: 'kampus',
      underscored: true,
      timestamps: true,
    }
  );

  Kampus.associate = (models) => {
    Kampus.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    Kampus.belongsTo(models.User, { foreignKey: 'updatedBy', as: 'updater' });
  };

  return Kampus;
};
