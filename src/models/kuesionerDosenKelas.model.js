module.exports = (sequelize, DataTypes) => {
  // Status "Isi Kuesioner" dosen pengajar per kelas; tidak ada baris = ya (lihat migration).
  const KuesionerDosenKelas = sequelize.define(
    'KuesionerDosenKelas',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      jadwalKuliahId: { type: DataTypes.INTEGER, allowNull: false },
      dosenId: { type: DataTypes.INTEGER, allowNull: false },
      isiKuesioner: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      updatedBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: 'kuesioner_dosen_kelas',
      underscored: true,
      timestamps: true,
    }
  );

  return KuesionerDosenKelas;
};
