module.exports = (sequelize, DataTypes) => {
  const PeriodePengajuanTa = sequelize.define(
    'PeriodePengajuanTa',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      // null = berlaku untuk semua prodi.
      jurusanId: { type: DataTypes.INTEGER, allowNull: true },
      tanggalMulai: { type: DataTypes.DATEONLY, allowNull: false },
      tanggalSelesai: { type: DataTypes.DATEONLY, allowNull: false },
      // Info untuk mahasiswa (mis. rekening pembayaran & kontak kasir).
      keterangan: { type: DataTypes.TEXT, allowNull: true },
      isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      isDelete: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      createdBy: { type: DataTypes.INTEGER, allowNull: true },
      updatedBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: 'periode_pengajuan_ta',
      underscored: true,
      timestamps: true,
      defaultScope: { where: { isDelete: false } },
      scopes: { withDeleted: {} },
    }
  );

  PeriodePengajuanTa.associate = (models) => {
    PeriodePengajuanTa.belongsTo(models.Jurusan, { foreignKey: 'jurusanId', as: 'jurusan' });
    PeriodePengajuanTa.hasMany(models.PengajuanTa, { foreignKey: 'periodePengajuanTaId', as: 'pengajuanList' });
  };

  return PeriodePengajuanTa;
};
