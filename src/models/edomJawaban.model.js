module.exports = (sequelize, DataTypes) => {
  // Isian angket dosen (EDOM): satu baris per (mahasiswa, kelas, dosen). `jawaban` = snapshot
  // [{ pertanyaanId, pertanyaan, openQuestion, nilai, jawaban, teks }] dari master Pertanyaan Angket Dosen.
  const EdomJawaban = sequelize.define(
    'EdomJawaban',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      mahasiswaId: { type: DataTypes.INTEGER, allowNull: false },
      jadwalKuliahId: { type: DataTypes.INTEGER, allowNull: false },
      dosenId: { type: DataTypes.INTEGER, allowNull: false },
      jawaban: {
        type: DataTypes.JSON,
        allowNull: false,
        get() {
          const v = this.getDataValue('jawaban');
          if (typeof v !== 'string') return v;
          try {
            return JSON.parse(v);
          } catch {
            return [];
          }
        },
      },
      saran: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      tableName: 'edom_jawaban',
      underscored: true,
      timestamps: true,
    }
  );

  EdomJawaban.associate = (models) => {
    EdomJawaban.belongsTo(models.Mahasiswa, { foreignKey: 'mahasiswaId', as: 'mahasiswa' });
    EdomJawaban.belongsTo(models.JadwalKuliah, { foreignKey: 'jadwalKuliahId', as: 'jadwalKuliah' });
    EdomJawaban.belongsTo(models.Dosen, { foreignKey: 'dosenId', as: 'dosen' });
  };

  return EdomJawaban;
};
