module.exports = (sequelize, DataTypes) => {
  const Gelombang = sequelize.define(
    'Gelombang',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      namaGelombang: { type: DataTypes.STRING(150), allowNull: false },
      // Tahun Ajaran PMB gelombang (opsional; Modul Admin › Tahun (PMB)).
      tahunPmbId: { type: DataTypes.INTEGER, allowNull: true },
      startDate: { type: DataTypes.DATEONLY, allowNull: false },
      endDate: { type: DataTypes.DATEONLY, allowNull: false },
      deskripsi: { type: DataTypes.TEXT, allowNull: true },
      // OTOMATIS = aktif sesuai rentang tanggal; AKTIF / TIDAK_AKTIF = diatur manual admin.
      status: { type: DataTypes.ENUM('OTOMATIS', 'AKTIF', 'TIDAK_AKTIF'), allowNull: false, defaultValue: 'OTOMATIS' },
      createdBy: { type: DataTypes.INTEGER, allowNull: true },
      updatedBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: 'gelombang',
      underscored: true,
      timestamps: true,
    }
  );

  Gelombang.associate = (models) => {
    Gelombang.belongsTo(models.TahunPmb, { foreignKey: 'tahunPmbId', as: 'tahunPmb' });
    Gelombang.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    Gelombang.belongsTo(models.User, { foreignKey: 'updatedBy', as: 'updater' });
  };

  return Gelombang;
};
