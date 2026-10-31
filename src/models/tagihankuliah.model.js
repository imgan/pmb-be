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
      // Tagihan import: Total Tagihan dari file keuangan sebelum dipotong. totalTagihan = tagihanAwal - potongan
      // (lihat utils/potonganTagihan.js); null untuk tagihan hasil generate lama.
      tagihanAwal: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: true,
        get() {
          const value = this.getDataValue('tagihanAwal');
          return value === null ? null : Number(value);
        },
      },
      totalTagihan: decimalField('totalTagihan'),
      // Hasil import keuangan: total sudah dibayar per tanggal import (pembayaran kasir yang dicatat
      // setelah importedAt ditambahkan di atasnya — lihat utils/tagihanSaldo.js) dan tunggakan
      // semester sebelumnya yang disimpan TERPISAH dari sisa semester ini.
      totalBayarImport: decimalField('totalBayarImport'),
      tunggakan: decimalField('tunggakan'),
      tanggalJatuhTempo: { type: DataTypes.DATEONLY, allowNull: true },
      // Nomor VA bank tujuan pembayaran tagihan ini (ditampilkan di portal mahasiswa).
      noVirtualAccount: { type: DataTypes.STRING(30), allowNull: true },
      keterangan: { type: DataTypes.STRING(255), allowNull: true },
      sumber: { type: DataTypes.ENUM('GENERATE', 'IMPORT'), allowNull: false, defaultValue: 'IMPORT' },
      importBatchId: { type: DataTypes.INTEGER, allowNull: true },
      importedAt: { type: DataTypes.DATE, allowNull: true },
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
    TagihanKuliah.hasMany(models.TagihanCicilan, { foreignKey: 'tagihanKuliahId', as: 'cicilanList' });
    TagihanKuliah.belongsTo(models.TagihanImportBatch, { foreignKey: 'importBatchId', as: 'importBatch' });
    TagihanKuliah.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    TagihanKuliah.belongsTo(models.User, { foreignKey: 'updatedBy', as: 'updater' });
  };

  return TagihanKuliah;
};
