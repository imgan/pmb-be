module.exports = (sequelize, DataTypes) => {
  const KehadiranUjianMahasiswa = sequelize.define(
    'KehadiranUjianMahasiswa',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      tahunAjaranId: { type: DataTypes.INTEGER, allowNull: false },
      jurusanId: { type: DataTypes.INTEGER, allowNull: false },
      jenisUjian: { type: DataTypes.ENUM('UTS', 'UAS'), allowNull: false },
      jumlahHadir: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      isDelete: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      createdBy: { type: DataTypes.INTEGER, allowNull: true },
      updatedBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: 'kehadiran_ujian_mahasiswa',
      underscored: true,
      timestamps: true,
      defaultScope: { where: { isDelete: false } },
      scopes: { withDeleted: {} },
    }
  );

  KehadiranUjianMahasiswa.associate = (models) => {
    KehadiranUjianMahasiswa.belongsTo(models.TahunAjaran, { foreignKey: 'tahunAjaranId', as: 'tahunAjaran' });
    KehadiranUjianMahasiswa.belongsTo(models.Jurusan, { foreignKey: 'jurusanId', as: 'jurusan' });
    KehadiranUjianMahasiswa.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    KehadiranUjianMahasiswa.belongsTo(models.User, { foreignKey: 'updatedBy', as: 'updater' });
  };

  return KehadiranUjianMahasiswa;
};
