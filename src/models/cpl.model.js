// Capaian Pembelajaran Lulusan (CPL) satu kurikulum — Manajemen Capaian (OBE).
module.exports = (sequelize, DataTypes) => {
  const Cpl = sequelize.define(
    'Cpl',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      kurikulumId: { type: DataTypes.INTEGER, allowNull: false },
      // null = CPL; terisi = Indikator Kinerja (IK) milik CPL induk tsb.
      parentId: { type: DataTypes.INTEGER, allowNull: true },
      kode: { type: DataTypes.STRING(20), allowNull: false },
      // Aspek CPL sesuai SN-Dikti.
      aspek: { type: DataTypes.ENUM('SIKAP', 'PENGETAHUAN', 'KETERAMPILAN_UMUM', 'KETERAMPILAN_KHUSUS'), allowNull: true },
      deskripsi: { type: DataTypes.TEXT, allowNull: false },
      // Deskripsi dalam Bahasa Inggris (opsional).
      deskripsiEn: { type: DataTypes.TEXT, allowNull: true },
    },
    { tableName: 'cpl', underscored: true, timestamps: true }
  );

  Cpl.associate = (models) => {
    Cpl.belongsTo(models.Kurikulum, { foreignKey: 'kurikulumId', as: 'kurikulum' });
    Cpl.belongsTo(models.Cpl, { foreignKey: 'parentId', as: 'induk' });
    Cpl.hasMany(models.Cpl, { foreignKey: 'parentId', as: 'indikatorList' });
    Cpl.hasMany(models.PlCpl, { foreignKey: 'cplId', as: 'plLinks' });
    Cpl.hasMany(models.CplMataKuliah, { foreignKey: 'cplId', as: 'mkLinks' });
  };

  return Cpl;
};
