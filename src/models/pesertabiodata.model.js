module.exports = (sequelize, DataTypes) => {
  const PesertaBiodata = sequelize.define(
    'PesertaBiodata',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      pesertaId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
      // Biodata pribadi boleh kosong di DB (biodata bisa dibuat dulu dari Data Pendidikan); wajib isi dicek di form.
      tempatLahir: { type: DataTypes.STRING(100), allowNull: true },
      tanggalLahir: { type: DataTypes.DATEONLY, allowNull: true },
      jenisKelamin: { type: DataTypes.ENUM('L', 'P'), allowNull: true },
      agama: { type: DataTypes.STRING(50), allowNull: true },
      kewarganegaraan: { type: DataTypes.STRING(50), allowNull: true },
      nik: { type: DataTypes.STRING(16), allowNull: true, unique: true },
      namaIbuKandung: { type: DataTypes.STRING(150), allowNull: true },
      jalan: { type: DataTypes.STRING(255), allowNull: true },
      rt: { type: DataTypes.STRING(3), allowNull: true },
      rw: { type: DataTypes.STRING(3), allowNull: true },
      desaKelurahan: { type: DataTypes.STRING(100), allowNull: true },
      provinsi: { type: DataTypes.STRING(100), allowNull: true },
      kabupaten: { type: DataTypes.STRING(100), allowNull: true },
      kecamatan: { type: DataTypes.STRING(100), allowNull: true },
      kodePos: { type: DataTypes.STRING(10), allowNull: true },
      noWhatsapp: { type: DataTypes.STRING(20), allowNull: true },
      // Data Pendidikan (nama asal sekolah ada di peserta.asalSekolah).
      jurusanSekolah: { type: DataTypes.STRING(100), allowNull: true },
      tahunLulus: { type: DataTypes.STRING(4), allowNull: true },
      jenisPengelolaanSekolah: { type: DataTypes.STRING(20), allowNull: true },
      alamatSekolah: { type: DataTypes.STRING(255), allowNull: true },
      nisn: { type: DataTypes.STRING(10), allowNull: true },
      isAgree: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      // true = peserta tidak bisa mengubah biodata lagi sampai admin membuka kunci.
      isLocked: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    },
    {
      tableName: 'peserta_biodata',
      underscored: true,
      timestamps: true,
    }
  );

  PesertaBiodata.associate = (models) => {
    PesertaBiodata.belongsTo(models.Peserta, { foreignKey: 'pesertaId', as: 'peserta' });
  };

  return PesertaBiodata;
};
