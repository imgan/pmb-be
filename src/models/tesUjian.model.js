module.exports = (sequelize, DataTypes) => {
  const TesUjian = sequelize.define(
    'TesUjian',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      namaUjian: { type: DataTypes.STRING(150), allowNull: false },
      gelombangId: { type: DataTypes.INTEGER, allowNull: false },
      // null = Semua Jurusan.
      prodi: { type: DataTypes.STRING(150), allowNull: true },
      tanggal: { type: DataTypes.DATEONLY, allowNull: false },
      lokasi: { type: DataTypes.TEXT, allowNull: true },
      waktu: { type: DataTypes.STRING(100), allowNull: true },
      // Paket soal LMS (bank ujian) yang dikerjakan online; null = tes tanpa soal online.
      bankUjianId: { type: DataTypes.INTEGER, allowNull: true },
      createdBy: { type: DataTypes.INTEGER, allowNull: true },
      updatedBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: 'tes_ujian',
      underscored: true,
      timestamps: true,
    }
  );

  TesUjian.associate = (models) => {
    TesUjian.belongsTo(models.Gelombang, { foreignKey: 'gelombangId', as: 'gelombang' });
    TesUjian.hasMany(models.TesUjianPeserta, { foreignKey: 'tesUjianId', as: 'peserta' });
    TesUjian.belongsTo(models.BankUjian, { foreignKey: 'bankUjianId', as: 'bankUjian' });
  };

  return TesUjian;
};
