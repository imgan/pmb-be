// E-learning: penerima konten bila target = PILIHAN (mahasiswa tertentu di kelas) atau GRUP (anggota grup, grup_ke / grup_nama).
module.exports = (sequelize, DataTypes) => {
  const ElearningKontenMahasiswa = sequelize.define(
    'ElearningKontenMahasiswa',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      kontenId: { type: DataTypes.INTEGER, allowNull: false },
      mahasiswaId: { type: DataTypes.INTEGER, allowNull: false },
      grupKe: { type: DataTypes.INTEGER, allowNull: true },
      grupNama: { type: DataTypes.STRING(60), allowNull: true },
    },
    { tableName: 'elearning_konten_mahasiswa', underscored: true, timestamps: true }
  );

  ElearningKontenMahasiswa.associate = (models) => {
    ElearningKontenMahasiswa.belongsTo(models.ElearningKonten, { foreignKey: 'kontenId', as: 'konten' });
    ElearningKontenMahasiswa.belongsTo(models.Mahasiswa, { foreignKey: 'mahasiswaId', as: 'mahasiswa' });
  };

  return ElearningKontenMahasiswa;
};
