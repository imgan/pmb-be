module.exports = (sequelize, DataTypes) => {
  const Krs = sequelize.define(
    'Krs',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      mahasiswaId: { type: DataTypes.INTEGER, allowNull: false },
      semester: { type: DataTypes.INTEGER, allowNull: false },
      tahunAjaranId: { type: DataTypes.INTEGER, allowNull: false },
      status: {
        type: DataTypes.ENUM('DRAFT', 'DIAJUKAN', 'DISETUJUI', 'DITOLAK'),
        allowNull: false,
        defaultValue: 'DRAFT',
      },
      createdBy: { type: DataTypes.INTEGER, allowNull: true },
      updatedBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: 'krs',
      underscored: true,
      timestamps: true,
    }
  );

  Krs.associate = (models) => {
    Krs.belongsTo(models.Mahasiswa, { foreignKey: 'mahasiswaId', as: 'mahasiswa' });
    Krs.belongsTo(models.TahunAjaran, { foreignKey: 'tahunAjaranId', as: 'tahunAjaran' });
    Krs.hasMany(models.KrsDetail, { foreignKey: 'krsId', as: 'detailList' });
    Krs.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    Krs.belongsTo(models.User, { foreignKey: 'updatedBy', as: 'updater' });
  };

  return Krs;
};
