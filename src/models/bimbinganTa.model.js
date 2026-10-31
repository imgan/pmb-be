module.exports = (sequelize, DataTypes) => {
  const BimbinganTa = sequelize.define(
    'BimbinganTa',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      pengajuanTaId: { type: DataTypes.INTEGER, allowNull: false },
      mahasiswaId: { type: DataTypes.INTEGER, allowNull: false },
      // Dosen pembimbing yang menginput catatan ini.
      dosenId: { type: DataTypes.INTEGER, allowNull: false },
      tanggal: { type: DataTypes.DATEONLY, allowNull: false },
      pokokPembahasan: { type: DataTypes.TEXT, allowNull: false },
      keterangan: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      tableName: 'bimbingan_ta',
      underscored: true,
      timestamps: true,
    }
  );

  BimbinganTa.associate = (models) => {
    BimbinganTa.belongsTo(models.PengajuanTa, { foreignKey: 'pengajuanTaId', as: 'pengajuan' });
    BimbinganTa.belongsTo(models.Mahasiswa, { foreignKey: 'mahasiswaId', as: 'mahasiswa' });
    BimbinganTa.belongsTo(models.Dosen, { foreignKey: 'dosenId', as: 'dosen' });
  };

  return BimbinganTa;
};
