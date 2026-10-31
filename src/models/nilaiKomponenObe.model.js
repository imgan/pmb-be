// Nilai mahasiswa per komponen Komposisi Nilai Kelas OBE (kunci "1" / "1.2" = metode / sub metode).
module.exports = (sequelize, DataTypes) => {
  const NilaiKomponenObe = sequelize.define(
    'NilaiKomponenObe',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      jadwalKuliahId: { type: DataTypes.INTEGER, allowNull: false },
      mahasiswaId: { type: DataTypes.INTEGER, allowNull: false },
      kunci: { type: DataTypes.STRING(20), allowNull: false },
      nilai: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0,
        get() {
          return Number(this.getDataValue('nilai') ?? 0);
        },
      },
    },
    { tableName: 'nilai_komponen_obe', underscored: true, timestamps: true }
  );

  NilaiKomponenObe.associate = (models) => {
    NilaiKomponenObe.belongsTo(models.JadwalKuliah, { foreignKey: 'jadwalKuliahId', as: 'jadwalKuliah' });
    NilaiKomponenObe.belongsTo(models.Mahasiswa, { foreignKey: 'mahasiswaId', as: 'mahasiswa' });
  };

  return NilaiKomponenObe;
};
