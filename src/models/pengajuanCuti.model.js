module.exports = (sequelize, DataTypes) => {
  const PengajuanCuti = sequelize.define(
    'PengajuanCuti',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      mahasiswaId: { type: DataTypes.INTEGER, allowNull: false },
      tahunAjaranId: { type: DataTypes.INTEGER, allowNull: true },
      semester: { type: DataTypes.INTEGER, allowNull: false },
      tanggalAwal: { type: DataTypes.DATEONLY, allowNull: false },
      tanggalAkhir: { type: DataTypes.DATEONLY, allowNull: false },
      tanggalAjuan: { type: DataTypes.DATEONLY, allowNull: false },
      alasan: { type: DataTypes.TEXT, allowNull: false },
      status: { type: DataTypes.ENUM('DIAJUKAN', 'DISETUJUI', 'DITOLAK'), allowNull: false, defaultValue: 'DIAJUKAN' },
      catatanProdi: { type: DataTypes.TEXT, allowNull: true },
      diverifikasiOleh: { type: DataTypes.INTEGER, allowNull: true },
      diverifikasiAt: { type: DataTypes.DATE, allowNull: true },
    },
    {
      tableName: 'pengajuan_cuti',
      underscored: true,
      timestamps: true,
    }
  );

  PengajuanCuti.associate = (models) => {
    PengajuanCuti.belongsTo(models.Mahasiswa, { foreignKey: 'mahasiswaId', as: 'mahasiswa' });
    PengajuanCuti.belongsTo(models.TahunAjaran, { foreignKey: 'tahunAjaranId', as: 'tahunAjaran' });
    PengajuanCuti.belongsTo(models.User, { foreignKey: 'diverifikasiOleh', as: 'verifikator' });
  };

  return PengajuanCuti;
};
