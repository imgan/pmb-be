module.exports = (sequelize, DataTypes) => {
  const PengajuanTa = sequelize.define(
    'PengajuanTa',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      periodePengajuanTaId: { type: DataTypes.INTEGER, allowNull: false },
      mahasiswaId: { type: DataTypes.INTEGER, allowNull: false },
      noTelepon: { type: DataTypes.STRING(30), allowNull: true },
      email: { type: DataTypes.STRING(150), allowNull: true },
      judul: { type: DataTypes.TEXT, allowNull: false },
      // Tempat KKP / observasi.
      tempatKkp: { type: DataTypes.STRING(200), allowNull: true },
      pembimbingUtamaId: { type: DataTypes.INTEGER, allowNull: true },
      pembimbingPendampingId: { type: DataTypes.INTEGER, allowNull: true },
      status: { type: DataTypes.ENUM('DIAJUKAN', 'DISETUJUI', 'DITOLAK'), allowNull: false, defaultValue: 'DIAJUKAN' },
      catatanProdi: { type: DataTypes.TEXT, allowNull: true },
      diverifikasiOleh: { type: DataTypes.INTEGER, allowNull: true },
      diverifikasiAt: { type: DataTypes.DATE, allowNull: true },
      isDelete: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    },
    {
      tableName: 'pengajuan_ta',
      underscored: true,
      timestamps: true,
      defaultScope: { where: { isDelete: false } },
      scopes: { withDeleted: {} },
    }
  );

  PengajuanTa.associate = (models) => {
    PengajuanTa.belongsTo(models.PeriodePengajuanTa, { foreignKey: 'periodePengajuanTaId', as: 'periode' });
    PengajuanTa.belongsTo(models.Mahasiswa, { foreignKey: 'mahasiswaId', as: 'mahasiswa' });
    PengajuanTa.belongsTo(models.Dosen, { foreignKey: 'pembimbingUtamaId', as: 'pembimbingUtama' });
    PengajuanTa.belongsTo(models.Dosen, { foreignKey: 'pembimbingPendampingId', as: 'pembimbingPendamping' });
    PengajuanTa.belongsTo(models.User, { foreignKey: 'diverifikasiOleh', as: 'verifikator' });
  };

  return PengajuanTa;
};
