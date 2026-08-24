module.exports = (sequelize, DataTypes) => {
  const KrsDetail = sequelize.define(
    'KrsDetail',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      krsId: { type: DataTypes.INTEGER, allowNull: false },
      jadwalKuliahId: { type: DataTypes.INTEGER, allowNull: false },
    },
    {
      tableName: 'krs_detail',
      underscored: true,
      timestamps: true,
    }
  );

  KrsDetail.associate = (models) => {
    KrsDetail.belongsTo(models.Krs, { foreignKey: 'krsId', as: 'krs' });
    KrsDetail.belongsTo(models.JadwalKuliah, { foreignKey: 'jadwalKuliahId', as: 'kelasKuliah' });
  };

  return KrsDetail;
};
