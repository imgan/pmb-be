module.exports = (sequelize, DataTypes) => {
  const JadwalKuliah = sequelize.define(
    'JadwalKuliah',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      kelas: { type: DataTypes.STRING(30), allowNull: false },
      kodeMataKuliah: { type: DataTypes.STRING(30), allowNull: false },
      namaMataKuliah: { type: DataTypes.STRING(150), allowNull: false },
      sks: { type: DataTypes.INTEGER, allowNull: true },
      sksTeori: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      sksPraktik: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      sksLab: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      dosenKordinatorId: { type: DataTypes.INTEGER, allowNull: false },
      tahunAjaranId: { type: DataTypes.INTEGER, allowNull: true },
      mataKuliahId: { type: DataTypes.INTEGER, allowNull: true },
      semester: { type: DataTypes.INTEGER, allowNull: true },
      hari: {
        type: DataTypes.JSON,
        allowNull: true,
        get() {
          const raw = this.getDataValue('hari');
          if (!raw) return null;
          return typeof raw === 'string' ? JSON.parse(raw) : raw;
        },
      },
      jam: { type: DataTypes.INTEGER, allowNull: true },
      ruangan: { type: DataTypes.STRING(50), allowNull: true },
      gcr: { type: DataTypes.STRING(255), allowNull: true },
      isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      createdBy: { type: DataTypes.INTEGER, allowNull: true },
      updatedBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: 'jadwal_kuliah',
      underscored: true,
      timestamps: true,
    }
  );

  JadwalKuliah.associate = (models) => {
    JadwalKuliah.belongsTo(models.Dosen, { foreignKey: 'dosenKordinatorId', as: 'dosenKordinator' });
    JadwalKuliah.belongsTo(models.TahunAjaran, { foreignKey: 'tahunAjaranId', as: 'tahunAjaran' });
    JadwalKuliah.belongsTo(models.MataKuliah, { foreignKey: 'mataKuliahId', as: 'mataKuliah' });
    JadwalKuliah.hasMany(models.KrsDetail, { foreignKey: 'jadwalKuliahId', as: 'krsDetailList' });
    JadwalKuliah.belongsToMany(models.Dosen, {
      through: 'jadwal_kuliah_dosen_pengampu',
      foreignKey: 'jadwalKuliahId',
      otherKey: 'dosenId',
      as: 'dosenPengampu',
      timestamps: false,
    });
    JadwalKuliah.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    JadwalKuliah.belongsTo(models.User, { foreignKey: 'updatedBy', as: 'updater' });
  };

  return JadwalKuliah;
};
