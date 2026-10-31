const defineTahunModul = require('./_tahunModul');

module.exports = (sequelize, DataTypes) => defineTahunModul(sequelize, DataTypes, 'TahunKeuangan', 'tahun_keuangan');
