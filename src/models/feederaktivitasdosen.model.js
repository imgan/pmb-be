// Dosen Pembimbing / Penguji Aktivitas Mahasiswa Feeder. urutan = pembimbing/penguji ke-.
module.exports = (sequelize, DataTypes) => {
  const FeederAktivitasDosen = sequelize.define(
    'FeederAktivitasDosen',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      aktivitasId: { type: DataTypes.INTEGER, allowNull: false },
      dosenId: { type: DataTypes.INTEGER, allowNull: false },
      peran: { type: DataTypes.ENUM('PEMBIMBING', 'PENGUJI'), allowNull: false },
      urutan: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
      kategoriKegiatan: { type: DataTypes.STRING(20), allowNull: true },
      createdBy: { type: DataTypes.INTEGER, allowNull: true },
      updatedBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    { tableName: 'feeder_aktivitas_dosen', underscored: true, timestamps: true }
  );

  FeederAktivitasDosen.associate = (models) => {
    FeederAktivitasDosen.belongsTo(models.FeederAktivitas, { foreignKey: 'aktivitasId', as: 'aktivitas' });
    FeederAktivitasDosen.belongsTo(models.Dosen, { foreignKey: 'dosenId', as: 'dosen' });
  };

  return FeederAktivitasDosen;
};
