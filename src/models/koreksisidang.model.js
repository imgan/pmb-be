module.exports = (sequelize, DataTypes) => {
  // Satu baris = satu butir koreksi dari seorang dosen (pembimbing/penguji) untuk satu
  // pendaftar sidang; dicetak sebagai Lembar Koreksi Sidang Tugas Akhir.
  const KoreksiSidang = sequelize.define(
    'KoreksiSidang',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      pendaftarSidangId: { type: DataTypes.INTEGER, allowNull: false },
      peran: {
        type: DataTypes.ENUM('PEMBIMBING_1', 'PEMBIMBING_2', 'PENGUJI_1', 'PENGUJI_2'),
        allowNull: false,
      },
      dosenId: { type: DataTypes.INTEGER, allowNull: false },
      babHalaman: { type: DataTypes.STRING(100), allowNull: true },
      uraian: { type: DataTypes.TEXT, allowNull: false },
      // Ditandai dosen setelah mahasiswa menyelesaikan revisi butir ini.
      isSelesai: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    },
    {
      tableName: 'koreksi_sidang',
      underscored: true,
      timestamps: true,
    }
  );

  KoreksiSidang.associate = (models) => {
    KoreksiSidang.belongsTo(models.PendaftarSidang, { foreignKey: 'pendaftarSidangId', as: 'pendaftarSidang' });
    KoreksiSidang.belongsTo(models.Dosen, { foreignKey: 'dosenId', as: 'dosen' });
  };

  return KoreksiSidang;
};
