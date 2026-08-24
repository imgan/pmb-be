module.exports = (sequelize, DataTypes) => {
  const PembimbingTaSkripsi = sequelize.define(
    'PembimbingTaSkripsi',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      dosenId: { type: DataTypes.INTEGER, allowNull: false },
      noSk: { type: DataTypes.STRING(100), allowNull: true },
      tanggalSk: { type: DataTypes.DATEONLY, allowNull: true },
      pembimbingKe: { type: DataTypes.ENUM('UTAMA', 'PENDAMPING'), allowNull: false, defaultValue: 'UTAMA' },
      periodeMulai: { type: DataTypes.DATEONLY, allowNull: false },
      periodeSelesai: { type: DataTypes.DATEONLY, allowNull: false },
      isDelete: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      createdBy: { type: DataTypes.INTEGER, allowNull: true },
      updatedBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: 'pembimbing_ta_skripsi',
      underscored: true,
      timestamps: true,
      defaultScope: { where: { isDelete: false } },
      scopes: { withDeleted: {} },
    }
  );

  PembimbingTaSkripsi.associate = (models) => {
    PembimbingTaSkripsi.belongsTo(models.Dosen, { foreignKey: 'dosenId', as: 'dosen' });
    PembimbingTaSkripsi.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    PembimbingTaSkripsi.belongsTo(models.User, { foreignKey: 'updatedBy', as: 'updater' });
  };

  return PembimbingTaSkripsi;
};
