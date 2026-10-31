module.exports = (sequelize, DataTypes) => {
  const Pengumuman = sequelize.define(
    'Pengumuman',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      judul: { type: DataTypes.STRING(200), allowNull: false },
      // HTML dari editor teks BAAK (dibersihkan di service sebelum disimpan).
      isi: { type: DataTypes.TEXT('medium'), allowNull: false },
      // null = untuk semua prodi.
      jurusanId: { type: DataTypes.INTEGER, allowNull: true },
      // Sasaran pengumuman: portal mahasiswa, portal dosen, atau keduanya.
      untuk: { type: DataTypes.ENUM('SEMUA', 'MAHASISWA', 'DOSEN'), allowNull: false, defaultValue: 'SEMUA' },
      tanggalTerbit: { type: DataTypes.DATEONLY, allowNull: false },
      tanggalBerakhir: { type: DataTypes.DATEONLY, allowNull: true },
      isPenting: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      isDelete: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      createdBy: { type: DataTypes.INTEGER, allowNull: true },
      updatedBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: 'pengumuman',
      underscored: true,
      timestamps: true,
      defaultScope: { where: { isDelete: false } },
      scopes: { withDeleted: {} },
    }
  );

  Pengumuman.associate = (models) => {
    Pengumuman.belongsTo(models.Jurusan, { foreignKey: 'jurusanId', as: 'jurusan' });
    Pengumuman.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    Pengumuman.belongsTo(models.User, { foreignKey: 'updatedBy', as: 'updater' });
  };

  return Pengumuman;
};
