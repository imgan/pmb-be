module.exports = (sequelize, DataTypes) => {
  const GolonganKelas = sequelize.define(
    'GolonganKelas',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      namaKelas: { type: DataTypes.STRING(100), allowNull: false },
      isDelete: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      createdBy: { type: DataTypes.INTEGER, allowNull: true },
      updatedBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: 'golongan_kelas',
      underscored: true,
      timestamps: true,
      defaultScope: { where: { isDelete: false } },
      scopes: { withDeleted: {} },
    }
  );

  GolonganKelas.associate = (models) => {
    GolonganKelas.hasMany(models.Jurusan, { foreignKey: 'golonganKelasId', as: 'jurusanList' });
    GolonganKelas.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    GolonganKelas.belongsTo(models.User, { foreignKey: 'updatedBy', as: 'updater' });
  };

  return GolonganKelas;
};
