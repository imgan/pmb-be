// Profil Lulusan (PL) satu kurikulum — Manajemen Capaian (OBE).
module.exports = (sequelize, DataTypes) => {
  const ProfilLulusan = sequelize.define(
    'ProfilLulusan',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      kurikulumId: { type: DataTypes.INTEGER, allowNull: false },
      kode: { type: DataTypes.STRING(20), allowNull: false },
      // Nama profil, mis. "Pemikir Kritis & Analitis".
      nama: { type: DataTypes.STRING(200), allowNull: false, defaultValue: '' },
      deskripsi: { type: DataTypes.TEXT, allowNull: false },
      // Deskripsi dalam Bahasa Inggris (opsional).
      deskripsiEn: { type: DataTypes.TEXT, allowNull: true },
      // Profesi / bidang kerja lulusan (teks bebas, mis. "Perekam Medis, Staf Administrasi RS").
      profesi: { type: DataTypes.TEXT, allowNull: true },
    },
    { tableName: 'profil_lulusan', underscored: true, timestamps: true }
  );

  ProfilLulusan.associate = (models) => {
    ProfilLulusan.belongsTo(models.Kurikulum, { foreignKey: 'kurikulumId', as: 'kurikulum' });
    ProfilLulusan.hasMany(models.PlCpl, { foreignKey: 'profilLulusanId', as: 'cplLinks' });
  };

  return ProfilLulusan;
};
