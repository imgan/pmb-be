// Jawaban peserta tes PMB per soal bank ujian; skor PG dihitung otomatis, skor essay diisi admin (null = belum dinilai).
module.exports = (sequelize, DataTypes) => {
  const TesUjianJawaban = sequelize.define(
    'TesUjianJawaban',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      tesUjianPesertaId: { type: DataTypes.INTEGER, allowNull: false },
      soalId: { type: DataTypes.INTEGER, allowNull: false },
      jawabanPilihan: { type: DataTypes.INTEGER, allowNull: true },
      jawabanTeks: { type: DataTypes.TEXT, allowNull: true },
      skor: {
        type: DataTypes.DECIMAL(6, 2),
        allowNull: true,
        get() {
          const v = this.getDataValue('skor');
          return v === null || v === undefined ? null : Number(v);
        },
      },
    },
    {
      tableName: 'tes_ujian_jawaban',
      underscored: true,
      timestamps: true,
      indexes: [{ unique: true, fields: ['tes_ujian_peserta_id', 'soal_id'] }],
    }
  );

  TesUjianJawaban.associate = (models) => {
    TesUjianJawaban.belongsTo(models.TesUjianPeserta, { foreignKey: 'tesUjianPesertaId', as: 'pesertaUjian' });
    TesUjianJawaban.belongsTo(models.BankUjianSoal, { foreignKey: 'soalId', as: 'soal' });
  };

  return TesUjianJawaban;
};
