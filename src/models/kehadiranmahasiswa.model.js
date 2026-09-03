module.exports = (sequelize, DataTypes) => {
  const KehadiranMahasiswa = sequelize.define(
    'KehadiranMahasiswa',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      kehadiranDosenId: { type: DataTypes.INTEGER, allowNull: false },
      mahasiswaId: { type: DataTypes.INTEGER, allowNull: false },
      status: {
        type: DataTypes.ENUM('HADIR', 'IZIN', 'SAKIT', 'ALPA'),
        allowNull: false,
        defaultValue: 'ALPA',
      },
      keterangan: { type: DataTypes.TEXT, allowNull: true },
      createdBy: { type: DataTypes.INTEGER, allowNull: true },
      updatedBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: 'kehadiran_mahasiswa',
      underscored: true,
      timestamps: true,
    }
  );

  KehadiranMahasiswa.associate = (models) => {
    KehadiranMahasiswa.belongsTo(models.KehadiranDosen, { foreignKey: 'kehadiranDosenId', as: 'kehadiranDosen' });
    KehadiranMahasiswa.belongsTo(models.Mahasiswa, { foreignKey: 'mahasiswaId', as: 'mahasiswa' });
    KehadiranMahasiswa.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    KehadiranMahasiswa.belongsTo(models.User, { foreignKey: 'updatedBy', as: 'updater' });
  };

  return KehadiranMahasiswa;
};
