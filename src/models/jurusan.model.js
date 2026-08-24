module.exports = (sequelize, DataTypes) => {
  const Jurusan = sequelize.define(
    'Jurusan',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      golonganKelasId: { type: DataTypes.INTEGER, allowNull: false },
      namaJurusan: { type: DataTypes.STRING(150), allowNull: false },
      kodeProdi: { type: DataTypes.STRING(20), allowNull: true },
      foto: { type: DataTypes.TEXT('long'), allowNull: true },
      prospekKarir: { type: DataTypes.TEXT, allowNull: true },
      jenjangPendidikan: { type: DataTypes.STRING(50), allowNull: true },
      gelarSingkat: { type: DataTypes.STRING(30), allowNull: true },
      gelarLengkap: { type: DataTypes.STRING(150), allowNull: true },
      namaFakultas: { type: DataTypes.STRING(150), allowNull: true },
      isDelete: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      createdBy: { type: DataTypes.INTEGER, allowNull: true },
      updatedBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: 'jurusan',
      underscored: true,
      timestamps: true,
      defaultScope: { where: { isDelete: false } },
      scopes: { withDeleted: {} },
    }
  );

  Jurusan.associate = (models) => {
    Jurusan.belongsTo(models.GolonganKelas, { foreignKey: 'golonganKelasId', as: 'golonganKelas' });
    Jurusan.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    Jurusan.belongsTo(models.User, { foreignKey: 'updatedBy', as: 'updater' });
  };

  return Jurusan;
};
