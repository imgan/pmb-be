module.exports = (sequelize, DataTypes) => {
  const DokumenKelengkapan = sequelize.define(
    'DokumenKelengkapan',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      namaKelengkapan: { type: DataTypes.STRING(150), allowNull: false },
      isWajib: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      isBeasiswa: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      file: { type: DataTypes.TEXT('long'), allowNull: true },
      createdBy: { type: DataTypes.INTEGER, allowNull: true },
      updatedBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: 'dokumen_kelengkapan',
      underscored: true,
      timestamps: true,
      defaultScope: { attributes: { exclude: ['file'] } },
      scopes: { withFile: { attributes: {} } },
    }
  );

  DokumenKelengkapan.associate = (models) => {
    DokumenKelengkapan.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    DokumenKelengkapan.belongsTo(models.User, { foreignKey: 'updatedBy', as: 'updater' });
    DokumenKelengkapan.hasMany(models.PesertaDokumen, { foreignKey: 'dokumenKelengkapanId', as: 'pesertaDokumen' });
  };

  return DokumenKelengkapan;
};
