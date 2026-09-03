module.exports = (sequelize, DataTypes) => {
  const Jurnal = sequelize.define(
    'Jurnal',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      tanggal: { type: DataTypes.DATEONLY, allowNull: false },
      noBukti: { type: DataTypes.STRING(50), allowNull: true },
      keterangan: { type: DataTypes.STRING(255), allowNull: true },
      referensiTipe: { type: DataTypes.STRING(50), allowNull: true },
      referensiId: { type: DataTypes.INTEGER, allowNull: true },
      createdBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: 'jurnal',
      underscored: true,
      timestamps: true,
    }
  );

  Jurnal.associate = (models) => {
    Jurnal.hasMany(models.JurnalDetail, { foreignKey: 'jurnalId', as: 'detailList' });
    Jurnal.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
  };

  return Jurnal;
};
