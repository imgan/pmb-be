module.exports = (sequelize, DataTypes) => {
  const JadwalKuliahDosenPengampu = sequelize.define(
    'JadwalKuliahDosenPengampu',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      jadwalKuliahId: { type: DataTypes.INTEGER, allowNull: false },
      dosenId: { type: DataTypes.INTEGER, allowNull: false },
      // SKS yang diberikan ke dosen ini; DECIMAL dikembalikan mysql2 sebagai string, jadi dikonversi ke number.
      sks: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        get() {
          const raw = this.getDataValue('sks');
          return raw === null || raw === undefined ? null : Number(raw);
        },
      },
    },
    {
      tableName: 'jadwal_kuliah_dosen_pengampu',
      underscored: true,
      timestamps: false,
    }
  );

  return JadwalKuliahDosenPengampu;
};
