// Rencana evaluasi mata kuliah pada satu periode — RPS. Baris induk = metode evaluasi + bobot (% nilai
// akhir); parentId terisi = sub metode (jenis evaluasi). Nilai per CPMK di RpsEvaluasiCpmk.
module.exports = (sequelize, DataTypes) => {
  const RpsEvaluasi = sequelize.define(
    'RpsEvaluasi',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      mataKuliahId: { type: DataTypes.INTEGER, allowNull: false },
      tahunAjaranId: { type: DataTypes.INTEGER, allowNull: false },
      parentId: { type: DataTypes.INTEGER, allowNull: true },
      urutan: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      metode: {
        type: DataTypes.ENUM('TUGAS_INDIVIDU', 'TUGAS_KELOMPOK', 'KUIS', 'UTS', 'UAS', 'PRAKTIKUM', 'PROYEK', 'PRESENTASI', 'PARTISIPASI', 'LAINNYA'),
        allowNull: true,
      },
      jenisEvaluasi: { type: DataTypes.TEXT, allowNull: true },
      bobot: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0,
        get() {
          return Number(this.getDataValue('bobot') ?? 0);
        },
      },
    },
    { tableName: 'rps_evaluasi', underscored: true, timestamps: true }
  );

  RpsEvaluasi.associate = (models) => {
    RpsEvaluasi.belongsTo(models.MataKuliah, { foreignKey: 'mataKuliahId', as: 'mataKuliah' });
    RpsEvaluasi.belongsTo(models.TahunAjaran, { foreignKey: 'tahunAjaranId', as: 'tahunAjaran' });
    RpsEvaluasi.belongsTo(models.RpsEvaluasi, { foreignKey: 'parentId', as: 'induk' });
    RpsEvaluasi.hasMany(models.RpsEvaluasiCpmk, { foreignKey: 'rpsEvaluasiId', as: 'cpmkList' });
  };

  return RpsEvaluasi;
};
