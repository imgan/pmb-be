// Aktivitas Mahasiswa untuk Feeder PDDIKTI. kategori: TA (tugas akhir/bimbingan), KKP (kerja
// praktek), PA (bimbingan akademis). jenisAnggota: '0' personal, '1' kelompok.
module.exports = (sequelize, DataTypes) => {
  const FeederAktivitas = sequelize.define(
    'FeederAktivitas',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      kategori: { type: DataTypes.ENUM('TA', 'KKP', 'PA'), allowNull: false },
      periode: { type: DataTypes.STRING(5), allowNull: false },
      jurusanId: { type: DataTypes.INTEGER, allowNull: true },
      jenisAktivitas: { type: DataTypes.STRING(3), allowNull: false },
      judul: { type: DataTypes.TEXT, allowNull: false },
      lokasi: { type: DataTypes.STRING(200), allowNull: true },
      noSk: { type: DataTypes.STRING(100), allowNull: true },
      tanggalSk: { type: DataTypes.DATEONLY, allowNull: true },
      jenisAnggota: { type: DataTypes.STRING(1), allowNull: false, defaultValue: '0' },
      keterangan: { type: DataTypes.TEXT, allowNull: true },
      // Penanda baris hasil generate dari data akademik (mis. "SIDANG:6").
      sourceKey: { type: DataTypes.STRING(60), allowNull: true, unique: true },
      createdBy: { type: DataTypes.INTEGER, allowNull: true },
      updatedBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    { tableName: 'feeder_aktivitas', underscored: true, timestamps: true }
  );

  FeederAktivitas.associate = (models) => {
    FeederAktivitas.belongsTo(models.Jurusan, { foreignKey: 'jurusanId', as: 'jurusan' });
    FeederAktivitas.hasMany(models.FeederAktivitasPeserta, { foreignKey: 'aktivitasId', as: 'pesertaList' });
    FeederAktivitas.hasMany(models.FeederAktivitasDosen, { foreignKey: 'aktivitasId', as: 'dosenList' });
  };

  return FeederAktivitas;
};
