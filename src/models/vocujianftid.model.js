module.exports = (sequelize, DataTypes) => {
  const VocUjianFtid = sequelize.define(
    'VocUjianFtid',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      dosenId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
      nominal: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
        get() {
          const raw = this.getDataValue('nominal');
          return raw === null ? null : Number(raw);
        },
      },
      paidAt: { type: DataTypes.DATE, allowNull: true },
      createdBy: { type: DataTypes.INTEGER, allowNull: true },
      updatedBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: 'voc_ujian_ftid',
      underscored: true,
      timestamps: true,
    }
  );

  VocUjianFtid.associate = (models) => {
    VocUjianFtid.belongsTo(models.Dosen, { foreignKey: 'dosenId', as: 'dosen' });
    VocUjianFtid.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    VocUjianFtid.belongsTo(models.User, { foreignKey: 'updatedBy', as: 'updater' });
  };

  return VocUjianFtid;
};
