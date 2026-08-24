module.exports = (sequelize, DataTypes) => {
  const PendaftarSidang = sequelize.define(
    'PendaftarSidang',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      mahasiswaId: { type: DataTypes.INTEGER, allowNull: false },
      jadwalSidangId: { type: DataTypes.INTEGER, allowNull: true },
      judul: { type: DataTypes.TEXT, allowNull: false },
      pembimbing1Id: { type: DataTypes.INTEGER, allowNull: true },
      pembimbing2Id: { type: DataTypes.INTEGER, allowNull: true },
      isDelete: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      createdBy: { type: DataTypes.INTEGER, allowNull: true },
      updatedBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: 'pendaftar_sidang',
      underscored: true,
      timestamps: true,
      defaultScope: { where: { isDelete: false } },
      scopes: { withDeleted: {} },
    }
  );

  PendaftarSidang.associate = (models) => {
    PendaftarSidang.belongsTo(models.Mahasiswa, { foreignKey: 'mahasiswaId', as: 'mahasiswa' });
    PendaftarSidang.belongsTo(models.JadwalSidang, { foreignKey: 'jadwalSidangId', as: 'jadwalSidang' });
    PendaftarSidang.belongsTo(models.Dosen, { foreignKey: 'pembimbing1Id', as: 'pembimbing1' });
    PendaftarSidang.belongsTo(models.Dosen, { foreignKey: 'pembimbing2Id', as: 'pembimbing2' });
    PendaftarSidang.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    PendaftarSidang.belongsTo(models.User, { foreignKey: 'updatedBy', as: 'updater' });
  };

  return PendaftarSidang;
};
