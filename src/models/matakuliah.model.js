module.exports = (sequelize, DataTypes) => {
  const MataKuliah = sequelize.define(
    'MataKuliah',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      kodeMk: { type: DataTypes.STRING(30), allowNull: false, unique: true },
      namaMk: { type: DataTypes.STRING(150), allowNull: false },
      sks: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      isDelete: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      createdBy: { type: DataTypes.INTEGER, allowNull: true },
      updatedBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: 'mata_kuliah',
      underscored: true,
      timestamps: true,
      defaultScope: { where: { isDelete: false } },
      scopes: { withDeleted: {} },
    }
  );

  MataKuliah.associate = (models) => {
    MataKuliah.hasMany(models.JadwalKuliah, { foreignKey: 'mataKuliahId', as: 'kelasKuliahList' });
    MataKuliah.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    MataKuliah.belongsTo(models.User, { foreignKey: 'updatedBy', as: 'updater' });
  };

  return MataKuliah;
};
