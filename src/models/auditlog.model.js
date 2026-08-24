module.exports = (sequelize, DataTypes) => {
  const AuditLog = sequelize.define(
    'AuditLog',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      actorType: { type: DataTypes.ENUM('staff', 'peserta', 'public'), allowNull: false, defaultValue: 'public' },
      actorId: { type: DataTypes.INTEGER, allowNull: true },
      actorName: { type: DataTypes.STRING(150), allowNull: true },
      actorEmail: { type: DataTypes.STRING(150), allowNull: true },
      method: { type: DataTypes.STRING(10), allowNull: false },
      module: { type: DataTypes.STRING(100), allowNull: false },
      action: { type: DataTypes.STRING(20), allowNull: false },
      path: { type: DataTypes.STRING(255), allowNull: false },
      description: { type: DataTypes.STRING(500), allowNull: false },
      statusCode: { type: DataTypes.INTEGER, allowNull: false },
      ipAddress: { type: DataTypes.STRING(64), allowNull: true },
      changes: { type: DataTypes.TEXT('long'), allowNull: true },
    },
    {
      tableName: 'audit_logs',
      underscored: true,
      timestamps: true,
      updatedAt: false,
    }
  );

  return AuditLog;
};
