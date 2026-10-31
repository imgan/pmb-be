// E-learning: pengumpulan tugas mahasiswa (teks / file) + nilai & catatan dosen.
module.exports = (sequelize, DataTypes) => {
  const ElearningTugasJawaban = sequelize.define(
    'ElearningTugasJawaban',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      kontenId: { type: DataTypes.INTEGER, allowNull: false },
      mahasiswaId: { type: DataTypes.INTEGER, allowNull: false },
      // Tugas grup: mahasiswa yang mengunggah (baris anggota lain adalah salinannya).
      dikumpulkanOleh: { type: DataTypes.INTEGER, allowNull: true },
      isi: { type: DataTypes.TEXT, allowNull: true },
      lampiran: { type: DataTypes.TEXT('long'), allowNull: true },
      lampiranNama: { type: DataTypes.STRING(255), allowNull: true },
      terlambat: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      nilai: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        get() {
          const v = this.getDataValue('nilai');
          return v === null || v === undefined ? null : Number(v);
        },
      },
      catatan: { type: DataTypes.TEXT, allowNull: true },
      dinilaiAt: { type: DataTypes.DATE, allowNull: true },
    },
    { tableName: 'elearning_tugas_jawaban', underscored: true, timestamps: true }
  );

  ElearningTugasJawaban.associate = (models) => {
    ElearningTugasJawaban.belongsTo(models.ElearningKonten, { foreignKey: 'kontenId', as: 'konten' });
    ElearningTugasJawaban.belongsTo(models.Mahasiswa, { foreignKey: 'mahasiswaId', as: 'mahasiswa' });
  };

  return ElearningTugasJawaban;
};
