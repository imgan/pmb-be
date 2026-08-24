module.exports = (sequelize, DataTypes) => {
  const KehadiranDosen = sequelize.define(
    'KehadiranDosen',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      jadwalKuliahId: { type: DataTypes.INTEGER, allowNull: false },
      dosenId: { type: DataTypes.INTEGER, allowNull: false },
      tanggalRealisasi: { type: DataTypes.DATEONLY, allowNull: false },
      status: {
        type: DataTypes.ENUM('HADIR', 'TIDAK_HADIR', 'IZIN', 'SAKIT'),
        allowNull: false,
        defaultValue: 'HADIR',
      },
      keterangan: { type: DataTypes.TEXT, allowNull: true },
      isDelete: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      createdBy: { type: DataTypes.INTEGER, allowNull: true },
      updatedBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: 'kehadiran_dosen',
      underscored: true,
      timestamps: true,
      defaultScope: { where: { isDelete: false } },
      scopes: { withDeleted: {} },
    }
  );

  KehadiranDosen.associate = (models) => {
    KehadiranDosen.belongsTo(models.JadwalKuliah, { foreignKey: 'jadwalKuliahId', as: 'jadwalKuliah' });
    KehadiranDosen.belongsTo(models.Dosen, { foreignKey: 'dosenId', as: 'dosen' });
    KehadiranDosen.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    KehadiranDosen.belongsTo(models.User, { foreignKey: 'updatedBy', as: 'updater' });
  };

  return KehadiranDosen;
};
