module.exports = (sequelize, DataTypes) => {
  const Yudisium = sequelize.define(
    'Yudisium',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      mahasiswaId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
      noSk: { type: DataTypes.STRING(100), allowNull: true },
      tanggalSk: { type: DataTypes.DATEONLY, allowNull: true },
      tanggalYudisium: { type: DataTypes.DATEONLY, allowNull: true },
      pin: { type: DataTypes.STRING(50), allowNull: true },
      judul: { type: DataTypes.TEXT, allowNull: true },
      pembimbing1Id: { type: DataTypes.INTEGER, allowNull: true },
      pembimbing2Id: { type: DataTypes.INTEGER, allowNull: true },
      createdBy: { type: DataTypes.INTEGER, allowNull: true },
      updatedBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: 'yudisium',
      underscored: true,
      timestamps: true,
    }
  );

  Yudisium.associate = (models) => {
    Yudisium.belongsTo(models.Mahasiswa, { foreignKey: 'mahasiswaId', as: 'mahasiswa' });
    Yudisium.belongsTo(models.Dosen, { foreignKey: 'pembimbing1Id', as: 'pembimbing1' });
    Yudisium.belongsTo(models.Dosen, { foreignKey: 'pembimbing2Id', as: 'pembimbing2' });
    Yudisium.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    Yudisium.belongsTo(models.User, { foreignKey: 'updatedBy', as: 'updater' });
  };

  return Yudisium;
};
