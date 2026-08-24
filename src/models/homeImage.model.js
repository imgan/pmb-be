module.exports = (sequelize, DataTypes) => {
  const HomeImage = sequelize.define(
    'HomeImage',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      heroImage: { type: DataTypes.TEXT('long'), allowNull: true },
      programStudiImage: { type: DataTypes.TEXT('long'), allowNull: true },
      kehidupanKampusImage: { type: DataTypes.TEXT('long'), allowNull: true },
      fasilitasLabImage: { type: DataTypes.TEXT('long'), allowNull: true },
      fasilitasGedungImage: { type: DataTypes.TEXT('long'), allowNull: true },
      fasilitasAulaImage: { type: DataTypes.TEXT('long'), allowNull: true },
      beasiswaSlide1Image: { type: DataTypes.TEXT('long'), allowNull: true },
      beasiswaSlide2Image: { type: DataTypes.TEXT('long'), allowNull: true },
      createdBy: { type: DataTypes.INTEGER, allowNull: true },
      updatedBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: 'home_images',
      underscored: true,
      timestamps: true,
    }
  );

  HomeImage.associate = (models) => {
    HomeImage.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    HomeImage.belongsTo(models.User, { foreignKey: 'updatedBy', as: 'updater' });
  };

  return HomeImage;
};
