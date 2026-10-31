// E-learning: soal pilihan ganda sebuah kuis.
module.exports = (sequelize, DataTypes) => {
  const ElearningSoal = sequelize.define(
    'ElearningSoal',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      kontenId: { type: DataTypes.INTEGER, allowNull: false },
      urutan: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
      pertanyaan: { type: DataTypes.TEXT, allowNull: false },
      // Array teks pilihan jawaban (disimpan sebagai JSON).
      pilihan: {
        type: DataTypes.TEXT,
        allowNull: false,
        get() {
          try {
            const v = JSON.parse(this.getDataValue('pilihan') || '[]');
            return Array.isArray(v) ? v : [];
          } catch {
            return [];
          }
        },
        set(v) {
          this.setDataValue('pilihan', JSON.stringify(Array.isArray(v) ? v : []));
        },
      },
      jawabanBenar: { type: DataTypes.INTEGER, allowNull: false },
    },
    { tableName: 'elearning_soal', underscored: true, timestamps: true }
  );

  ElearningSoal.associate = (models) => {
    ElearningSoal.belongsTo(models.ElearningKonten, { foreignKey: 'kontenId', as: 'konten' });
  };

  return ElearningSoal;
};
