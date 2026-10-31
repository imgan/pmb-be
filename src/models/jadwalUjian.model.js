module.exports = (sequelize, DataTypes) => {
  const JadwalUjian = sequelize.define(
    'JadwalUjian',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      jadwalKuliahId: { type: DataTypes.INTEGER, allowNull: false },
      jenisUjian: { type: DataTypes.ENUM('UTS', 'UAS'), allowNull: false },
      // Isian prodi/dosen; ruangan, jam ke-, dosen & pengawas mengikuti jadwal_kuliah.
      status: { type: DataTypes.ENUM('ONLINE', 'OFFLINE'), allowNull: true },
      sifat: { type: DataTypes.STRING(30), allowNull: true },
      tanggal: { type: DataTypes.DATEONLY, allowNull: true },
      updatedBy: { type: DataTypes.INTEGER, allowNull: true },
      updatedByDosenId: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: 'jadwal_ujian',
      underscored: true,
      timestamps: true,
    }
  );

  JadwalUjian.associate = (models) => {
    JadwalUjian.belongsTo(models.JadwalKuliah, { foreignKey: 'jadwalKuliahId', as: 'jadwalKuliah' });
  };

  return JadwalUjian;
};
