// E-learning: jawaban kuis mahasiswa (satu kali kirim per kuis) + skor otomatis.
module.exports = (sequelize, DataTypes) => {
  const ElearningJawaban = sequelize.define(
    'ElearningJawaban',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      kontenId: { type: DataTypes.INTEGER, allowNull: false },
      mahasiswaId: { type: DataTypes.INTEGER, allowNull: false },
      // { [soalId]: indexPilihan } (disimpan sebagai JSON).
      jawaban: {
        type: DataTypes.TEXT,
        allowNull: false,
        get() {
          try {
            return JSON.parse(this.getDataValue('jawaban') || '{}');
          } catch {
            return {};
          }
        },
        set(v) {
          this.setDataValue('jawaban', JSON.stringify(v ?? {}));
        },
      },
      benar: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      jumlahSoal: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      skor: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0,
        get() {
          return Number(this.getDataValue('skor') ?? 0);
        },
      },
    },
    { tableName: 'elearning_jawaban', underscored: true, timestamps: true }
  );

  ElearningJawaban.associate = (models) => {
    ElearningJawaban.belongsTo(models.ElearningKonten, { foreignKey: 'kontenId', as: 'konten' });
    ElearningJawaban.belongsTo(models.Mahasiswa, { foreignKey: 'mahasiswaId', as: 'mahasiswa' });
  };

  return ElearningJawaban;
};
