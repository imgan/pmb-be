module.exports = (sequelize, DataTypes) => {
  const Keringanan = sequelize.define(
    'Keringanan',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      mahasiswaId: { type: DataTypes.INTEGER, allowNull: false },
      tanggal: { type: DataTypes.DATEONLY, allowNull: false },
      totalTagihan: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: true,
        get() {
          const value = this.getDataValue('totalTagihan');
          return value === null ? null : Number(value);
        },
      },
      jumlahBayar: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        get() {
          const value = this.getDataValue('jumlahBayar');
          return value === null ? null : Number(value);
        },
      },
      alasan: { type: DataTypes.TEXT, allowNull: true },
      status: {
        type: DataTypes.ENUM('DIAJUKAN', 'DISETUJUI', 'DITOLAK'),
        allowNull: false,
        defaultValue: 'DIAJUKAN',
      },
      createdBy: { type: DataTypes.INTEGER, allowNull: true },
      updatedBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: 'keringanan',
      underscored: true,
      timestamps: true,
    }
  );

  Keringanan.associate = (models) => {
    Keringanan.belongsTo(models.Mahasiswa, { foreignKey: 'mahasiswaId', as: 'mahasiswa' });
    Keringanan.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    Keringanan.belongsTo(models.User, { foreignKey: 'updatedBy', as: 'updater' });
  };

  return Keringanan;
};
