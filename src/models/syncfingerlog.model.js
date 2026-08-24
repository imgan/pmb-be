module.exports = (sequelize, DataTypes) => {
  const SyncFingerLog = sequelize.define(
    'SyncFingerLog',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      mesin: { type: DataTypes.ENUM('A1', 'A2'), allowNull: false },
      nik: { type: DataTypes.STRING(30), allowNull: false },
      tanggal: { type: DataTypes.DATE, allowNull: false },
      karyawanId: { type: DataTypes.INTEGER, allowNull: true },
      status: { type: DataTypes.ENUM('PENDING', 'PROCESSED'), allowNull: false, defaultValue: 'PENDING' },
      processedAt: { type: DataTypes.DATE, allowNull: true },
      createdBy: { type: DataTypes.INTEGER, allowNull: true },
      updatedBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: 'sync_finger_log',
      underscored: true,
      timestamps: true,
    }
  );

  SyncFingerLog.associate = (models) => {
    SyncFingerLog.belongsTo(models.Karyawan, { foreignKey: 'karyawanId', as: 'karyawan' });
    SyncFingerLog.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    SyncFingerLog.belongsTo(models.User, { foreignKey: 'updatedBy', as: 'updater' });
  };

  return SyncFingerLog;
};
