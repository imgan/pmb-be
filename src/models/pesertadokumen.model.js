module.exports = (sequelize, DataTypes) => {
  const PesertaDokumen = sequelize.define(
    'PesertaDokumen',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      pesertaId: { type: DataTypes.INTEGER, allowNull: false },
      dokumenKelengkapanId: { type: DataTypes.INTEGER, allowNull: false },
      fileName: { type: DataTypes.STRING(255), allowNull: false },
      file: { type: DataTypes.TEXT('long'), allowNull: false },
    },
    {
      tableName: 'peserta_dokumen',
      underscored: true,
      timestamps: true,
      indexes: [{ unique: true, fields: ['peserta_id', 'dokumen_kelengkapan_id'] }],
    }
  );

  PesertaDokumen.associate = (models) => {
    PesertaDokumen.belongsTo(models.Peserta, { foreignKey: 'pesertaId', as: 'peserta' });
    PesertaDokumen.belongsTo(models.DokumenKelengkapan, { foreignKey: 'dokumenKelengkapanId', as: 'dokumenKelengkapan' });
  };

  return PesertaDokumen;
};
