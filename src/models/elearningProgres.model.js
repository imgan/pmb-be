// E-learning: materi / video yang ditandai selesai (dipelajari / ditonton) oleh mahasiswa.
module.exports = (sequelize, DataTypes) => {
  const ElearningProgres = sequelize.define(
    'ElearningProgres',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      kontenId: { type: DataTypes.INTEGER, allowNull: false },
      mahasiswaId: { type: DataTypes.INTEGER, allowNull: false },
    },
    { tableName: 'elearning_progres', underscored: true, timestamps: true }
  );

  ElearningProgres.associate = (models) => {
    ElearningProgres.belongsTo(models.ElearningKonten, { foreignKey: 'kontenId', as: 'konten' });
    ElearningProgres.belongsTo(models.Mahasiswa, { foreignKey: 'mahasiswaId', as: 'mahasiswa' });
  };

  return ElearningProgres;
};
