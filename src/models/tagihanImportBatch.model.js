module.exports = (sequelize, DataTypes) => {
  const TagihanImportBatch = sequelize.define(
    'TagihanImportBatch',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      fileName: { type: DataTypes.STRING(255), allowNull: true },
      status: { type: DataTypes.ENUM('BERHASIL', 'SEBAGIAN', 'GAGAL'), allowNull: false },
      totalRows: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      createdRows: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      updatedRows: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      unchangedRows: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      failedRows: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      errors: { type: DataTypes.JSON, allowNull: true },
      importedBy: { type: DataTypes.INTEGER, allowNull: true },
      importedAt: { type: DataTypes.DATE, allowNull: false },
    },
    { tableName: 'tagihan_import_batch', underscored: true, timestamps: true }
  );

  TagihanImportBatch.associate = (models) => {
    TagihanImportBatch.belongsTo(models.User, { foreignKey: 'importedBy', as: 'importer' });
    TagihanImportBatch.hasMany(models.TagihanImportLog, { foreignKey: 'batchId', as: 'logs' });
  };

  return TagihanImportBatch;
};
