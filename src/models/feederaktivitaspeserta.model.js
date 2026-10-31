// Peserta (anggota) Aktivitas Mahasiswa Feeder. jenisPeran: '1' Ketua, '2' Anggota, '3' Personal.
module.exports = (sequelize, DataTypes) => {
  const FeederAktivitasPeserta = sequelize.define(
    'FeederAktivitasPeserta',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      aktivitasId: { type: DataTypes.INTEGER, allowNull: false },
      mahasiswaId: { type: DataTypes.INTEGER, allowNull: false },
      jenisPeran: { type: DataTypes.STRING(1), allowNull: false, defaultValue: '3' },
      createdBy: { type: DataTypes.INTEGER, allowNull: true },
      updatedBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    { tableName: 'feeder_aktivitas_peserta', underscored: true, timestamps: true }
  );

  FeederAktivitasPeserta.associate = (models) => {
    FeederAktivitasPeserta.belongsTo(models.FeederAktivitas, { foreignKey: 'aktivitasId', as: 'aktivitas' });
    FeederAktivitasPeserta.belongsTo(models.Mahasiswa, { foreignKey: 'mahasiswaId', as: 'mahasiswa' });
  };

  return FeederAktivitasPeserta;
};
