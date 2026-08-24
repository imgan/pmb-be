module.exports = (sequelize, DataTypes) => {
  const PembimbingAkademik = sequelize.define(
    'PembimbingAkademik',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      dosenId: { type: DataTypes.INTEGER, allowNull: false },
      noSk: { type: DataTypes.STRING(100), allowNull: true },
      tanggalSk: { type: DataTypes.DATEONLY, allowNull: true },
      isDelete: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      createdBy: { type: DataTypes.INTEGER, allowNull: true },
      updatedBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: 'pembimbing_akademik',
      underscored: true,
      timestamps: true,
      defaultScope: { where: { isDelete: false } },
      scopes: { withDeleted: {} },
    }
  );

  PembimbingAkademik.associate = (models) => {
    PembimbingAkademik.belongsTo(models.Dosen, { foreignKey: 'dosenId', as: 'dosen' });
    PembimbingAkademik.hasMany(models.Mahasiswa, { foreignKey: 'pembimbingAkademikId', as: 'mahasiswaList' });
    PembimbingAkademik.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    PembimbingAkademik.belongsTo(models.User, { foreignKey: 'updatedBy', as: 'updater' });
  };

  return PembimbingAkademik;
};
