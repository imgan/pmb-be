module.exports = (sequelize, DataTypes) => {
  const VocUjianDosen = sequelize.define(
    'VocUjianDosen',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      jadwalKuliahId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
      jumlah: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      tanggalBerkas: { type: DataTypes.DATEONLY, allowNull: true },
      pengawasRealId: { type: DataTypes.INTEGER, allowNull: true },
      createdBy: { type: DataTypes.INTEGER, allowNull: true },
      updatedBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: 'voc_ujian_dosen',
      underscored: true,
      timestamps: true,
    }
  );

  VocUjianDosen.associate = (models) => {
    VocUjianDosen.belongsTo(models.JadwalKuliah, { foreignKey: 'jadwalKuliahId', as: 'jadwalKuliah' });
    VocUjianDosen.belongsTo(models.Dosen, { foreignKey: 'pengawasRealId', as: 'pengawasReal' });
    VocUjianDosen.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    VocUjianDosen.belongsTo(models.User, { foreignKey: 'updatedBy', as: 'updater' });
  };

  return VocUjianDosen;
};
