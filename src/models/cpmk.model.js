// CPMK (Capaian Pembelajaran Mata Kuliah) satu mata kuliah — RPS. parentId terisi = Sub-CPMK.
module.exports = (sequelize, DataTypes) => {
  const Cpmk = sequelize.define(
    'Cpmk',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      mataKuliahId: { type: DataTypes.INTEGER, allowNull: false },
      // null = CPMK; terisi = Sub-CPMK milik CPMK induk tsb.
      parentId: { type: DataTypes.INTEGER, allowNull: true },
      kode: { type: DataTypes.STRING(20), allowNull: false },
      deskripsi: { type: DataTypes.TEXT, allowNull: false },
      deskripsiEn: { type: DataTypes.TEXT, allowNull: true },
    },
    { tableName: 'cpmk', underscored: true, timestamps: true }
  );

  Cpmk.associate = (models) => {
    Cpmk.belongsTo(models.MataKuliah, { foreignKey: 'mataKuliahId', as: 'mataKuliah' });
    Cpmk.belongsTo(models.Cpmk, { foreignKey: 'parentId', as: 'induk' });
    Cpmk.hasMany(models.Cpmk, { foreignKey: 'parentId', as: 'subList' });
    Cpmk.hasMany(models.CpmkCpl, { foreignKey: 'cpmkId', as: 'cplLinks' });
  };

  return Cpmk;
};
