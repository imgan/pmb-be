module.exports = (sequelize, DataTypes) => {
  const decimalField = (fieldName) => ({
    type: DataTypes.DECIMAL(14, 2),
    allowNull: false,
    defaultValue: 0,
    get() {
      const value = this.getDataValue(fieldName);
      return value === null ? null : Number(value);
    },
  });

  const TagihanKuliah = sequelize.define(
    'TagihanKuliah',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      mahasiswaId: { type: DataTypes.INTEGER, allowNull: false },
      tahunAjaranId: { type: DataTypes.INTEGER, allowNull: false },
      semester: { type: DataTypes.INTEGER, allowNull: false },
      // SKS yang benar-benar diambil mahasiswa di FRS/KRS untuk tahun ajaran ini, dan harga per
      // SKS yang berlaku saat tagihan digenerate (snapshot dari TarifKuliah.biayaSks — disimpan
      // terpisah supaya histori tagihan tidak berubah kalau tarif per-SKS diubah belakangan).
      sksDiambil: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      hargaPerSks: decimalField('hargaPerSks'),
      // Subtotal biaya SKS = sksDiambil x hargaPerSks (bukan lagi harga per SKS itu sendiri).
      biayaSks: decimalField('biayaSks'),
      biayaBpp: decimalField('biayaBpp'),
      biayaSpp: decimalField('biayaSpp'),
      potongan: decimalField('potongan'),
      totalTagihan: decimalField('totalTagihan'),
      createdBy: { type: DataTypes.INTEGER, allowNull: true },
      updatedBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: 'tagihan_kuliah',
      underscored: true,
      timestamps: true,
    }
  );

  TagihanKuliah.associate = (models) => {
    TagihanKuliah.belongsTo(models.Mahasiswa, { foreignKey: 'mahasiswaId', as: 'mahasiswa' });
    TagihanKuliah.belongsTo(models.TahunAjaran, { foreignKey: 'tahunAjaranId', as: 'tahunAjaran' });
    TagihanKuliah.hasMany(models.PembayaranKuliah, { foreignKey: 'tagihanKuliahId', as: 'pembayaranList' });
    TagihanKuliah.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    TagihanKuliah.belongsTo(models.User, { foreignKey: 'updatedBy', as: 'updater' });
  };

  return TagihanKuliah;
};
