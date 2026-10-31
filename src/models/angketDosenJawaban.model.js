module.exports = (sequelize, DataTypes) => {
  // Pilihan jawaban angket dosen (skala nilai), satu daftar untuk semua pertanyaan (lihat migration).
  const AngketDosenJawaban = sequelize.define(
    'AngketDosenJawaban',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      jawaban: { type: DataTypes.STRING(100), allowNull: false },
      nilai: { type: DataTypes.INTEGER, allowNull: false, unique: true },
      createdBy: { type: DataTypes.INTEGER, allowNull: true },
      updatedBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: 'angket_dosen_jawaban',
      underscored: true,
      timestamps: true,
    }
  );

  return AngketDosenJawaban;
};
