// Soal bank ujian: PG (pilihan JSON + jawaban benar) atau ESSAY (dinilai manual), berbobot.
module.exports = (sequelize, DataTypes) => {
  const BankUjianSoal = sequelize.define(
    'BankUjianSoal',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      bankUjianId: { type: DataTypes.INTEGER, allowNull: false },
      urutan: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
      tipe: { type: DataTypes.ENUM('PG', 'ESSAY'), allowNull: false, defaultValue: 'PG' },
      pertanyaan: { type: DataTypes.TEXT, allowNull: false },
      pilihan: {
        type: DataTypes.TEXT,
        allowNull: true,
        get() {
          try {
            const v = JSON.parse(this.getDataValue('pilihan') || '[]');
            return Array.isArray(v) ? v : [];
          } catch {
            return [];
          }
        },
        set(v) {
          this.setDataValue('pilihan', Array.isArray(v) && v.length ? JSON.stringify(v) : null);
        },
      },
      jawabanBenar: { type: DataTypes.INTEGER, allowNull: true },
      bobot: {
        type: DataTypes.DECIMAL(6, 2),
        allowNull: false,
        defaultValue: 1,
        get() {
          return Number(this.getDataValue('bobot'));
        },
      },
    },
    { tableName: 'bank_ujian_soal', underscored: true, timestamps: true }
  );

  BankUjianSoal.associate = (models) => {
    BankUjianSoal.belongsTo(models.BankUjian, { foreignKey: 'bankUjianId', as: 'bankUjian' });
  };

  return BankUjianSoal;
};
