module.exports = (sequelize, DataTypes) => {
  const JadwalSidang = sequelize.define(
    'JadwalSidang',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      tahunAjaranId: { type: DataTypes.INTEGER, allowNull: false },
      semester: { type: DataTypes.ENUM('GANJIL', 'GENAP'), allowNull: false },
      jurusanId: { type: DataTypes.INTEGER, allowNull: false },
      tanggal: { type: DataTypes.DATEONLY, allowNull: false },
      jam: { type: DataTypes.STRING(30), allowNull: false },
      ruangan: { type: DataTypes.STRING(100), allowNull: true },
      noSk: { type: DataTypes.STRING(100), allowNull: true },
      dosenPengujiId: { type: DataTypes.INTEGER, allowNull: true },
      isDelete: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      createdBy: { type: DataTypes.INTEGER, allowNull: true },
      updatedBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: 'jadwal_sidang',
      underscored: true,
      timestamps: true,
      defaultScope: { where: { isDelete: false } },
      scopes: { withDeleted: {} },
    }
  );

  JadwalSidang.associate = (models) => {
    JadwalSidang.belongsTo(models.TahunAjaran, { foreignKey: 'tahunAjaranId', as: 'tahunAjaran' });
    JadwalSidang.belongsTo(models.Jurusan, { foreignKey: 'jurusanId', as: 'jurusan' });
    JadwalSidang.belongsTo(models.Dosen, { foreignKey: 'dosenPengujiId', as: 'dosenPenguji' });
    JadwalSidang.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    JadwalSidang.belongsTo(models.User, { foreignKey: 'updatedBy', as: 'updater' });
  };

  return JadwalSidang;
};
