module.exports = (sequelize, DataTypes) => {
  const DokumenPendaftaran = sequelize.define(
    'DokumenPendaftaran',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      namaPendaftaran: { type: DataTypes.STRING(150), allowNull: false },
      isWajib: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      createdBy: { type: DataTypes.INTEGER, allowNull: true },
      updatedBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: 'dokumen_pendaftaran',
      underscored: true,
      timestamps: true,
    }
  );

  DokumenPendaftaran.associate = (models) => {
    DokumenPendaftaran.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    DokumenPendaftaran.belongsTo(models.User, { foreignKey: 'updatedBy', as: 'updater' });
  };

  return DokumenPendaftaran;
};
