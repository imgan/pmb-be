// Tagihan TA/Skripsi per mahasiswa; nominal disalin dari biaya pendaftaran tarif_ta_skripsi prodinya saat generate.
module.exports = (sequelize, DataTypes) => {
  const TagihanTaSkripsi = sequelize.define(
    'TagihanTaSkripsi',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      mahasiswaId: { type: DataTypes.INTEGER, allowNull: false },
      tarifTaSkripsiId: { type: DataTypes.INTEGER, allowNull: true },
      tahunTaSkripsiId: { type: DataTypes.INTEGER, allowNull: true },
      periode: { type: DataTypes.INTEGER, allowNull: false },
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
    { tableName: 'tagihan_ta_skripsi', underscored: true, timestamps: true }
  );

  TagihanTaSkripsi.associate = (models) => {
    TagihanTaSkripsi.belongsTo(models.Mahasiswa, { foreignKey: 'mahasiswaId', as: 'mahasiswa' });
    TagihanTaSkripsi.belongsTo(models.TarifTaSkripsi, { foreignKey: 'tarifTaSkripsiId', as: 'tarif' });
    TagihanTaSkripsi.belongsTo(models.TahunTaSkripsi, { foreignKey: 'tahunTaSkripsiId', as: 'tahunTaSkripsi' });
    TagihanTaSkripsi.hasMany(models.PembayaranTaSkripsi, { foreignKey: 'tagihanTaSkripsiId', as: 'pembayaranList' });
    TagihanTaSkripsi.hasMany(models.TagihanTaSkripsiCicilan, { foreignKey: 'tagihanTaSkripsiId', as: 'cicilanList' });
  };

  return TagihanTaSkripsi;
};
