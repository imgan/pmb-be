// Detail RPS satu mata kuliah pada satu periode (tahun ajaran "berlaku sejak").
module.exports = (sequelize, DataTypes) => {
  const Rps = sequelize.define(
    'Rps',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      mataKuliahId: { type: DataTypes.INTEGER, allowNull: false },
      tahunAjaranId: { type: DataTypes.INTEGER, allowNull: false },
      deskripsi: { type: DataTypes.TEXT, allowNull: true },
      bahanKajian: { type: DataTypes.TEXT, allowNull: true },
      pustakaUtama: { type: DataTypes.TEXT, allowNull: true },
      pustakaPendukung: { type: DataTypes.TEXT, allowNull: true },
      mediaSoftware: { type: DataTypes.TEXT, allowNull: true },
      mediaHardware: { type: DataTypes.TEXT, allowNull: true },
      mkPrasyarat: { type: DataTypes.STRING(255), allowNull: true },
      dosenPengembang: { type: DataTypes.STRING(255), allowNull: true },
      koordinatorRmk: { type: DataTypes.STRING(255), allowNull: true },
      teamTeaching: { type: DataTypes.TEXT, allowNull: true },
      tanggalPenyusunan: { type: DataTypes.DATEONLY, allowNull: true },
    },
    { tableName: 'rps', underscored: true, timestamps: true }
  );

  Rps.associate = (models) => {
    Rps.belongsTo(models.MataKuliah, { foreignKey: 'mataKuliahId', as: 'mataKuliah' });
    Rps.belongsTo(models.TahunAjaran, { foreignKey: 'tahunAjaranId', as: 'tahunAjaran' });
  };

  return Rps;
};
