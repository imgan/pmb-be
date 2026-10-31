module.exports = (sequelize, DataTypes) => {
  const TagihanImportLog = sequelize.define(
    'TagihanImportLog',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      batchId: { type: DataTypes.INTEGER, allowNull: false },
      rowNumber: { type: DataTypes.INTEGER, allowNull: true },
      tagihanKuliahId: { type: DataTypes.INTEGER, allowNull: true },
      mahasiswaId: { type: DataTypes.INTEGER, allowNull: true },
      nim: { type: DataTypes.STRING(30), allowNull: true },
      aksi: { type: DataTypes.ENUM('BARU', 'UBAH', 'TETAP', 'GAGAL'), allowNull: false },
      nilaiLama: { type: DataTypes.JSON, allowNull: true },
      nilaiBaru: { type: DataTypes.JSON, allowNull: true },
      pesan: { type: DataTypes.STRING(500), allowNull: true },
    },
    { tableName: 'tagihan_import_log', underscored: true, timestamps: true }
  );

  TagihanImportLog.associate = (models) => {
    TagihanImportLog.belongsTo(models.TagihanImportBatch, { foreignKey: 'batchId', as: 'batch' });
    TagihanImportLog.belongsTo(models.Mahasiswa, { foreignKey: 'mahasiswaId', as: 'mahasiswa' });
  };

  return TagihanImportLog;
};
