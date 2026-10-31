// Mata kuliah kurikulum yang diaktifkan prodi untuk satu tahun akademik/semester; sumber pilihan
// mata kuliah saat BAAK menambah jadwal kuliah.
module.exports = (sequelize, DataTypes) => {
  const MatakuliahAktif = sequelize.define(
    'MatakuliahAktif',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      tahunAjaranId: { type: DataTypes.INTEGER, allowNull: false },
      mataKuliahId: { type: DataTypes.INTEGER, allowNull: false },
      // Semester tempat mata kuliah dibuka pada tahun akademik tsb ("Aktif Semester").
      semester: { type: DataTypes.INTEGER, allowNull: false },
      createdBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: 'matakuliah_aktif',
      underscored: true,
      timestamps: true,
    }
  );

  MatakuliahAktif.associate = (models) => {
    MatakuliahAktif.belongsTo(models.TahunAjaran, { foreignKey: 'tahunAjaranId', as: 'tahunAjaran' });
    MatakuliahAktif.belongsTo(models.MataKuliah, { foreignKey: 'mataKuliahId', as: 'mataKuliah' });
  };

  return MatakuliahAktif;
};
