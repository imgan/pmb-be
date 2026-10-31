// E-learning: gambar & dokumen materi (bisa lebih dari satu per konten), disimpan sebagai data URL.
module.exports = (sequelize, DataTypes) => {
  const ElearningKontenBerkas = sequelize.define(
    'ElearningKontenBerkas',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      kontenId: { type: DataTypes.INTEGER, allowNull: false },
      jenis: { type: DataTypes.ENUM('GAMBAR', 'DOKUMEN'), allowNull: false },
      nama: { type: DataTypes.STRING(255), allowNull: false },
      tipe: { type: DataTypes.STRING(150), allowNull: true },
      ukuran: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      data: { type: DataTypes.TEXT('long'), allowNull: false },
      // Gambar: thumbnail kecil (data URL) untuk sampul di daftar materi.
      thumb: { type: DataTypes.TEXT('medium'), allowNull: true },
      urutan: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    },
    { tableName: 'elearning_konten_berkas', underscored: true, timestamps: true }
  );

  ElearningKontenBerkas.associate = (models) => {
    ElearningKontenBerkas.belongsTo(models.ElearningKonten, { foreignKey: 'kontenId', as: 'konten' });
  };

  return ElearningKontenBerkas;
};
