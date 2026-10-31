module.exports = (sequelize, DataTypes) => {
  const TesUjianPeserta = sequelize.define(
    'TesUjianPeserta',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      tesUjianId: { type: DataTypes.INTEGER, allowNull: false },
      pesertaId: { type: DataTypes.INTEGER, allowNull: false },
      nilai: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
      status: { type: DataTypes.ENUM('belum_ujian', 'lulus', 'tidak_lulus'), allowNull: false, defaultValue: 'belum_ujian' },
      // Pengerjaan soal online (bank ujian): waktu mulai & waktu kirim jawaban.
      mulaiAt: { type: DataTypes.DATE, allowNull: true },
      selesaiAt: { type: DataTypes.DATE, allowNull: true },
      createdBy: { type: DataTypes.INTEGER, allowNull: true },
      updatedBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: 'tes_ujian_peserta',
      underscored: true,
      timestamps: true,
      indexes: [{ unique: true, fields: ['tes_ujian_id', 'peserta_id'] }],
    }
  );

  TesUjianPeserta.associate = (models) => {
    TesUjianPeserta.belongsTo(models.TesUjian, { foreignKey: 'tesUjianId', as: 'tesUjian' });
    TesUjianPeserta.belongsTo(models.Peserta, { foreignKey: 'pesertaId', as: 'peserta' });
    TesUjianPeserta.hasMany(models.TesUjianJawaban, { foreignKey: 'tesUjianPesertaId', as: 'jawaban' });
  };

  return TesUjianPeserta;
};
