module.exports = (sequelize, DataTypes) => {
  const PresentaseKehadiranMahasiswa = sequelize.define(
    'PresentaseKehadiranMahasiswa',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      tahunAjaranId: { type: DataTypes.INTEGER, allowNull: false },
      jurusanId: { type: DataTypes.INTEGER, allowNull: false },
      rataRataKehadiran: { type: DataTypes.DECIMAL(6, 2), allowNull: false, defaultValue: 0 },
      isDelete: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      createdBy: { type: DataTypes.INTEGER, allowNull: true },
      updatedBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: 'presentase_kehadiran_mahasiswa',
      underscored: true,
      timestamps: true,
      defaultScope: { where: { isDelete: false } },
      scopes: { withDeleted: {} },
    }
  );

  PresentaseKehadiranMahasiswa.associate = (models) => {
    PresentaseKehadiranMahasiswa.belongsTo(models.TahunAjaran, { foreignKey: 'tahunAjaranId', as: 'tahunAjaran' });
    PresentaseKehadiranMahasiswa.belongsTo(models.Jurusan, { foreignKey: 'jurusanId', as: 'jurusan' });
    PresentaseKehadiranMahasiswa.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    PresentaseKehadiranMahasiswa.belongsTo(models.User, { foreignKey: 'updatedBy', as: 'updater' });
  };

  return PresentaseKehadiranMahasiswa;
};
