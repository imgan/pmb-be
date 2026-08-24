module.exports = (sequelize, DataTypes) => {
  const PesertaBiodata = sequelize.define(
    'PesertaBiodata',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      pesertaId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
      tempatLahir: { type: DataTypes.STRING(100), allowNull: false },
      tanggalLahir: { type: DataTypes.DATEONLY, allowNull: false },
      jenisKelamin: { type: DataTypes.ENUM('L', 'P'), allowNull: false },
      agama: { type: DataTypes.STRING(50), allowNull: false },
      kewarganegaraan: { type: DataTypes.STRING(50), allowNull: false },
      nik: { type: DataTypes.STRING(16), allowNull: false, unique: true },
      namaIbuKandung: { type: DataTypes.STRING(150), allowNull: false },
      jalan: { type: DataTypes.STRING(255), allowNull: false },
      rt: { type: DataTypes.STRING(3), allowNull: false },
      rw: { type: DataTypes.STRING(3), allowNull: false },
      desaKelurahan: { type: DataTypes.STRING(100), allowNull: false },
      provinsi: { type: DataTypes.STRING(100), allowNull: false },
      kabupaten: { type: DataTypes.STRING(100), allowNull: false },
      kecamatan: { type: DataTypes.STRING(100), allowNull: false },
      kodePos: { type: DataTypes.STRING(10), allowNull: false },
      noWhatsapp: { type: DataTypes.STRING(20), allowNull: false },
      isAgree: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
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
