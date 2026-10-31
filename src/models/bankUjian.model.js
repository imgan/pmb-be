// LMS → Kuis & Ujian: paket ujian (soal PG + essay) buatan admin, dipakai tes seleksi PMB.
module.exports = (sequelize, DataTypes) => {
  const BankUjian = sequelize.define(
    'BankUjian',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      judul: { type: DataTypes.STRING(200), allowNull: false },
      deskripsi: { type: DataTypes.TEXT, allowNull: true },
      // null = tanpa batas waktu.
      durasiMenit: { type: DataTypes.INTEGER, allowNull: true },
      acakSoal: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      createdBy: { type: DataTypes.INTEGER, allowNull: true },
      updatedBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    { tableName: 'bank_ujian', underscored: true, timestamps: true }
  );

  BankUjian.associate = (models) => {
    BankUjian.hasMany(models.BankUjianSoal, { foreignKey: 'bankUjianId', as: 'soal' });
    BankUjian.hasMany(models.TesUjian, { foreignKey: 'bankUjianId', as: 'tesUjian' });
  };

  return BankUjian;
};
