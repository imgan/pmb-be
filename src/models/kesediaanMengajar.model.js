const HARI = ['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu', 'minggu'];

module.exports = (sequelize, DataTypes) => {
  const KesediaanMengajar = sequelize.define(
    'KesediaanMengajar',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      dosenId: { type: DataTypes.INTEGER, allowNull: false },
      tahunAjaranId: { type: DataTypes.INTEGER, allowNull: false },
      mataKuliahId: { type: DataTypes.INTEGER, allowNull: false },
      // Rentang jam bersedia per hari ("HH:MM-HH:MM"); null = tidak bersedia hari itu.
      ...Object.fromEntries(HARI.map((h) => [h, { type: DataTypes.STRING(11), allowNull: true }])),
    },
    {
      tableName: 'kesediaan_mengajar',
      underscored: true,
      timestamps: true,
    }
  );

  KesediaanMengajar.HARI = HARI;

  KesediaanMengajar.associate = (models) => {
    KesediaanMengajar.belongsTo(models.Dosen, { foreignKey: 'dosenId', as: 'dosen' });
    KesediaanMengajar.belongsTo(models.TahunAjaran, { foreignKey: 'tahunAjaranId', as: 'tahunAjaran' });
    KesediaanMengajar.belongsTo(models.MataKuliah, { foreignKey: 'mataKuliahId', as: 'mataKuliah' });
  };

  return KesediaanMengajar;
};
