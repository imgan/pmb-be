// Rencana pembelajaran satu sesi (pertemuan) mata kuliah pada satu periode — RPS.
const toNumber = (v) => (v === null || v === undefined ? null : Number(v));

module.exports = (sequelize, DataTypes) => {
  const RpsPertemuan = sequelize.define(
    'RpsPertemuan',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      mataKuliahId: { type: DataTypes.INTEGER, allowNull: false },
      tahunAjaranId: { type: DataTypes.INTEGER, allowNull: false },
      sesi: { type: DataTypes.INTEGER, allowNull: false },
      jenisPertemuan: { type: DataTypes.ENUM('KULIAH', 'PRAKTIKUM', 'UTS', 'UAS', 'LAINNYA'), allowNull: false, defaultValue: 'KULIAH' },
      // Id CPMK / Sub-CPMK yang dicapai pada sesi ini (disimpan sebagai teks JSON).
      cpmkIds: {
        type: DataTypes.TEXT,
        allowNull: true,
        get() {
          try {
            const v = JSON.parse(this.getDataValue('cpmkIds') || '[]');
            return Array.isArray(v) ? v.map(Number) : [];
          } catch {
            return [];
          }
        },
        set(v) {
          this.setDataValue('cpmkIds', JSON.stringify(Array.isArray(v) ? v.map(Number) : []));
        },
      },
      materi: { type: DataTypes.TEXT, allowNull: false },
      materiEn: { type: DataTypes.TEXT, allowNull: true },
      indikator: { type: DataTypes.TEXT, allowNull: true },
      kriteriaPenilaian: { type: DataTypes.TEXT, allowNull: true },
      // Bentuk pembelajaran sesi: Luring / Daring / Hybrid.
      bentukPembelajaran: { type: DataTypes.ENUM('LURING', 'DARING', 'HYBRID'), allowNull: true },
      metodePembelajaran: { type: DataTypes.TEXT, allowNull: true },
      waktu: { type: DataTypes.STRING(100), allowNull: true },
      bobot: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        get() {
          return toNumber(this.getDataValue('bobot'));
        },
      },
      referensi: { type: DataTypes.TEXT, allowNull: true },
    },
    { tableName: 'rps_pertemuan', underscored: true, timestamps: true }
  );

  RpsPertemuan.associate = (models) => {
    RpsPertemuan.belongsTo(models.MataKuliah, { foreignKey: 'mataKuliahId', as: 'mataKuliah' });
    RpsPertemuan.belongsTo(models.TahunAjaran, { foreignKey: 'tahunAjaranId', as: 'tahunAjaran' });
  };

  return RpsPertemuan;
};
