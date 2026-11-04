// Tagihan wisuda per mahasiswa per tahun tarif; nominal disalin dari tarif_lain (kode berawalan W) saat generate.
module.exports = (sequelize, DataTypes) => {
  const TagihanWisuda = sequelize.define(
    'TagihanWisuda',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      mahasiswaId: { type: DataTypes.INTEGER, allowNull: false },
      tarifLainId: { type: DataTypes.INTEGER, allowNull: true },
      kodeBiaya: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'WISUDA' },
      tahun: { type: DataTypes.INTEGER, allowNull: false },
      keterangan: { type: DataTypes.STRING(255), allowNull: true },
      totalTagihan: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
        get() {
          const value = this.getDataValue('totalTagihan');
          return value === null ? null : Number(value);
        },
      },
      createdBy: { type: DataTypes.INTEGER, allowNull: true },
      updatedBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    { tableName: 'tagihan_wisuda', underscored: true, timestamps: true }
  );

  TagihanWisuda.associate = (models) => {
    TagihanWisuda.belongsTo(models.Mahasiswa, { foreignKey: 'mahasiswaId', as: 'mahasiswa' });
    TagihanWisuda.belongsTo(models.TarifLain, { foreignKey: 'tarifLainId', as: 'tarif' });
    TagihanWisuda.hasMany(models.PembayaranWisuda, { foreignKey: 'tagihanWisudaId', as: 'pembayaranList' });
    TagihanWisuda.hasMany(models.TagihanWisudaCicilan, { foreignKey: 'tagihanWisudaId', as: 'cicilanList' });
  };

  return TagihanWisuda;
};
