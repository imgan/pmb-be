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
      // Popup Sumber Informasi: sumber info kampus, keterangan, kode unik; terkunci = hanya bisa dibaca.
      sumberInformasiId: { type: DataTypes.INTEGER, allowNull: true },
      keteranganSumber: { type: DataTypes.TEXT, allowNull: true },
      kodeUnik: { type: DataTypes.STRING(50), allowNull: true },
      sumberTerkunci: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      // Popup Sumber Informasi 2: kelas perkuliahan, beasiswa, ukuran almamater, jurusan pilihan 1–3 + kunci data.
      golonganKelasId: { type: DataTypes.INTEGER, allowNull: true },
      beasiswaId: { type: DataTypes.INTEGER, allowNull: true },
      ukuranAlmamater: { type: DataTypes.STRING(20), allowNull: true },
      jurusan1Id: { type: DataTypes.INTEGER, allowNull: true, field: 'jurusan1_id' },
      jurusan2Id: { type: DataTypes.INTEGER, allowNull: true, field: 'jurusan2_id' },
      jurusan3Id: { type: DataTypes.INTEGER, allowNull: true, field: 'jurusan3_id' },
      dataPmbTerkunci: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
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
    CalonMahasiswa.belongsTo(models.SumberInformasi, { foreignKey: 'sumberInformasiId', as: 'sumberInformasi' });
    CalonMahasiswa.belongsTo(models.GolonganKelas, { foreignKey: 'golonganKelasId', as: 'golonganKelas' });
    CalonMahasiswa.belongsTo(models.Beasiswa, { foreignKey: 'beasiswaId', as: 'beasiswa' });
    CalonMahasiswa.belongsTo(models.Jurusan, { foreignKey: 'jurusan1Id', as: 'jurusan1' });
    CalonMahasiswa.belongsTo(models.Jurusan, { foreignKey: 'jurusan2Id', as: 'jurusan2' });
    CalonMahasiswa.belongsTo(models.Jurusan, { foreignKey: 'jurusan3Id', as: 'jurusan3' });
    CalonMahasiswa.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    CalonMahasiswa.belongsTo(models.User, { foreignKey: 'updatedBy', as: 'updater' });
  };

  return CalonMahasiswa;
};
