module.exports = (sequelize, DataTypes) => {
  const TahunAjaran = sequelize.define(
    'TahunAjaran',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      nama: { type: DataTypes.STRING(20), allowNull: false, unique: true },
      tahunMulai: { type: DataTypes.INTEGER, allowNull: false },
      tahunSelesai: { type: DataTypes.INTEGER, allowNull: false },
      isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      isDelete: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      createdBy: { type: DataTypes.INTEGER, allowNull: true },
      updatedBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: 'tahun_ajaran',
      underscored: true,
      timestamps: true,
      defaultScope: { where: { isDelete: false } },
      scopes: { withDeleted: {} },
    }
  );

  TahunAjaran.associate = (models) => {
    TahunAjaran.hasMany(models.Mahasiswa, { foreignKey: 'tahunAjaranId', as: 'mahasiswaList' });
    TahunAjaran.hasMany(models.JadwalKuliah, { foreignKey: 'tahunAjaranId', as: 'jadwalKuliahList' });
    TahunAjaran.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    TahunAjaran.belongsTo(models.User, { foreignKey: 'updatedBy', as: 'updater' });
  };

  return TahunAjaran;
};
