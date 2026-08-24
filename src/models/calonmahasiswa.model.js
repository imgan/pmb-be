module.exports = (sequelize, DataTypes) => {
  const CalonMahasiswa = sequelize.define(
    'CalonMahasiswa',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      nama: { type: DataTypes.STRING(150), allowNull: false },
      asalSekolah: { type: DataTypes.STRING(150), allowNull: false },
      prodi: { type: DataTypes.STRING(150), allowNull: false },
      gelombangId: { type: DataTypes.INTEGER, allowNull: true },
      pesertaId: { type: DataTypes.INTEGER, allowNull: true },
      noTelepon: { type: DataTypes.STRING(30), allowNull: true },
      skemaPembiayaan: { type: DataTypes.ENUM('beasiswa', 'mandiri'), allowNull: false, defaultValue: 'mandiri' },
      formulirPendaftaran: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      lulusTesMasuk: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      akunBeasiswa: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: null },
      kelengkapanPersyaratan: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      statusBeasiswa: { type: DataTypes.ENUM('diusulkan', 'disetujui', 'ditolak'), allowNull: true, defaultValue: null },
      statusKuliah: { type: DataTypes.ENUM('menunggu', 'diterima', 'ditolak'), allowNull: false, defaultValue: 'menunggu' },
      createdBy: { type: DataTypes.INTEGER, allowNull: true },
      updatedBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: 'calon_mahasiswa',
      underscored: true,
      timestamps: true,
    }
  );

  CalonMahasiswa.associate = (models) => {
    CalonMahasiswa.belongsTo(models.Gelombang, { foreignKey: 'gelombangId', as: 'gelombang' });
    CalonMahasiswa.belongsTo(models.Peserta, { foreignKey: 'pesertaId', as: 'peserta' });
    CalonMahasiswa.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    CalonMahasiswa.belongsTo(models.User, { foreignKey: 'updatedBy', as: 'updater' });
  };

  return CalonMahasiswa;
};
