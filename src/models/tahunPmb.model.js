const defineTahunModul = require('./_tahunModul');

module.exports = (sequelize, DataTypes) => {
  const TahunPmb = defineTahunModul(sequelize, DataTypes, 'TahunPmb', 'tahun_pmb');
  TahunPmb.associate = (models) => {
    TahunPmb.hasMany(models.Gelombang, { foreignKey: 'tahunPmbId', as: 'gelombangList' });
  };
  return TahunPmb;
};
