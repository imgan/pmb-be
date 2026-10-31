// Mahasiswa Lulus / Drop Out untuk Feeder PDDIKTI — satu baris per mahasiswa. Jenis keluar
// memakai kode Feeder (1 Lulus, 2 Mutasi, 3 Dikeluarkan, 4 Mengundurkan Diri, 5 Putus Sekolah,
// 6 Wafat, 7 Hilang, Z Lainnya).
module.exports = (sequelize, DataTypes) => {
  const FeederKelulusan = sequelize.define(
    'FeederKelulusan',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      mahasiswaId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
      jenisKeluar: { type: DataTypes.STRING(1), allowNull: false, defaultValue: '1' },
      tanggalKeluar: { type: DataTypes.DATEONLY, allowNull: true },
      periodeKeluar: { type: DataTypes.STRING(5), allowNull: true },
      noSkYudisium: { type: DataTypes.STRING(100), allowNull: true },
      tanggalSkYudisium: { type: DataTypes.DATEONLY, allowNull: true },
      ipk: {
        type: DataTypes.DECIMAL(4, 2),
        allowNull: true,
        get() {
          const raw = this.getDataValue('ipk');
          return raw === null || raw === undefined ? null : Number(raw);
        },
      },
      noIjazah: { type: DataTypes.STRING(100), allowNull: true },
      judulSkripsi: { type: DataTypes.TEXT, allowNull: true },
      bulanAwalBimbingan: { type: DataTypes.DATEONLY, allowNull: true },
      bulanAkhirBimbingan: { type: DataTypes.DATEONLY, allowNull: true },
      keterangan: { type: DataTypes.TEXT, allowNull: true },
      createdBy: { type: DataTypes.INTEGER, allowNull: true },
      updatedBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    { tableName: 'feeder_kelulusan', underscored: true, timestamps: true }
  );

  FeederKelulusan.associate = (models) => {
    FeederKelulusan.belongsTo(models.Mahasiswa, { foreignKey: 'mahasiswaId', as: 'mahasiswa' });
  };

  return FeederKelulusan;
};
