// Aktivitas Kuliah Mahasiswa (AKM) per periode untuk Feeder PDDIKTI. Periode = tahun awal TA +
// 1 (ganjil) / 2 (genap), mis. "20261". Status memakai kode Feeder (A/C/N/G/M).
module.exports = (sequelize, DataTypes) => {
  const decimal = (field, precision = 4) => ({
    type: DataTypes.DECIMAL(precision, 2),
    allowNull: field === 'biayaKuliah',
    get() {
      const raw = this.getDataValue(field);
      return raw === null || raw === undefined ? null : Number(raw);
    },
  });

  const FeederAkm = sequelize.define(
    'FeederAkm',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      mahasiswaId: { type: DataTypes.INTEGER, allowNull: false },
      periode: { type: DataTypes.STRING(5), allowNull: false },
      statusMahasiswa: { type: DataTypes.STRING(1), allowNull: false, defaultValue: 'A' },
      ips: decimal('ips'),
      ipk: decimal('ipk'),
      sksSemester: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      sksTotal: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      biayaKuliah: decimal('biayaKuliah', 14),
      createdBy: { type: DataTypes.INTEGER, allowNull: true },
      updatedBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    { tableName: 'feeder_akm', underscored: true, timestamps: true }
  );

  FeederAkm.associate = (models) => {
    FeederAkm.belongsTo(models.Mahasiswa, { foreignKey: 'mahasiswaId', as: 'mahasiswa' });
  };

  return FeederAkm;
};
