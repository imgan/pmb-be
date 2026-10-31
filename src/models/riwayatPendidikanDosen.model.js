module.exports = (sequelize, DataTypes) => {
  const RiwayatPendidikanDosen = sequelize.define(
    'RiwayatPendidikanDosen',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      dosenId: { type: DataTypes.INTEGER, allowNull: false },
      perguruanTinggi: { type: DataTypes.STRING(200), allowNull: false },
      // S1 / S2 / S3 / Profesi / dll.
      jenjang: { type: DataTypes.STRING(20), allowNull: false },
      programStudi: { type: DataTypes.STRING(150), allowNull: true },
      gelar: { type: DataTypes.STRING(50), allowNull: true },
      tahunLulus: { type: DataTypes.INTEGER, allowNull: true },
      noIjazah: { type: DataTypes.STRING(100), allowNull: true },
    },
    {
      tableName: 'riwayat_pendidikan_dosen',
      underscored: true,
      timestamps: true,
    }
  );

  RiwayatPendidikanDosen.associate = (models) => {
    RiwayatPendidikanDosen.belongsTo(models.Dosen, { foreignKey: 'dosenId', as: 'dosen' });
  };

  return RiwayatPendidikanDosen;
};
