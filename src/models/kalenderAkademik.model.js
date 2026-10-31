module.exports = (sequelize, DataTypes) => {
  // Kegiatan kalender akademik per tahun akademik (lihat migration).
  const KalenderAkademik = sequelize.define(
    'KalenderAkademik',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      tahunAjaranId: { type: DataTypes.INTEGER, allowNull: false },
      namaKegiatan: { type: DataTypes.STRING(200), allowNull: false },
      kategori: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'LAINNYA' },
      tanggalMulai: { type: DataTypes.DATEONLY, allowNull: false },
      tanggalSelesai: { type: DataTypes.DATEONLY, allowNull: false },
      keterangan: { type: DataTypes.TEXT, allowNull: true },
      createdBy: { type: DataTypes.INTEGER, allowNull: true },
      updatedBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: 'kalender_akademik',
      underscored: true,
      timestamps: true,
    }
  );

  KalenderAkademik.associate = (models) => {
    KalenderAkademik.belongsTo(models.TahunAjaran, { foreignKey: 'tahunAjaranId', as: 'tahunAjaran' });
  };

  return KalenderAkademik;
};
