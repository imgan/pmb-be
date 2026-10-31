module.exports = (sequelize, DataTypes) => {
  const TiketMahasiswa = sequelize.define(
    'TiketMahasiswa',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      // Diisi setelah dibuat: TKT-<tahun>-<id 6 digit>.
      nomorTiket: { type: DataTypes.STRING(30), allowNull: true },
      mahasiswaId: { type: DataTypes.INTEGER, allowNull: false },
      jenisKebutuhan: {
        type: DataTypes.ENUM('PERANGKAT_KOMPUTER', 'JARINGAN_INTERNET', 'SISTEM_INFORMASI', 'KEBUTUHAN_DATA', 'LAIN_LAIN'),
        allowNull: false,
      },
      uraian: { type: DataTypes.TEXT, allowNull: false },
      status: { type: DataTypes.ENUM('BARU', 'DIPROSES', 'SELESAI', 'DITOLAK'), allowNull: false, defaultValue: 'BARU' },
      // Tanggapan / alasan dari petugas SIM.
      tanggapan: { type: DataTypes.TEXT, allowNull: true },
      petugasId: { type: DataTypes.INTEGER, allowNull: true },
      tanggalDitanggapi: { type: DataTypes.DATE, allowNull: true },
    },
    {
      tableName: 'tiket_mahasiswa',
      underscored: true,
      timestamps: true,
    }
  );

  TiketMahasiswa.associate = (models) => {
    TiketMahasiswa.belongsTo(models.Mahasiswa, { foreignKey: 'mahasiswaId', as: 'mahasiswa' });
    TiketMahasiswa.belongsTo(models.User, { foreignKey: 'petugasId', as: 'petugas' });
  };

  return TiketMahasiswa;
};
