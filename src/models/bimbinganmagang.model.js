module.exports = (sequelize, DataTypes) => {
  const BimbinganMagang = sequelize.define(
    'BimbinganMagang',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      mahasiswaId: { type: DataTypes.INTEGER, allowNull: false },
      pembimbingMagangId: { type: DataTypes.INTEGER, allowNull: true },
      judul: { type: DataTypes.TEXT, allowNull: true },
      nilai: { type: DataTypes.STRING(10), allowNull: true },
      kelas: { type: DataTypes.STRING(20), allowNull: true },
      isDelete: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      createdBy: { type: DataTypes.INTEGER, allowNull: true },
      updatedBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: 'bimbingan_magang',
      underscored: true,
      timestamps: true,
      defaultScope: { where: { isDelete: false } },
      scopes: { withDeleted: {} },
    }
  );

  BimbinganMagang.associate = (models) => {
    BimbinganMagang.belongsTo(models.Mahasiswa, { foreignKey: 'mahasiswaId', as: 'mahasiswa' });
    BimbinganMagang.belongsTo(models.PembimbingMagang, { foreignKey: 'pembimbingMagangId', as: 'pembimbingMagang' });
    BimbinganMagang.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    BimbinganMagang.belongsTo(models.User, { foreignKey: 'updatedBy', as: 'updater' });
  };

  return BimbinganMagang;
};
