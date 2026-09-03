module.exports = (sequelize, DataTypes) => {
  const DaftarPotongan = sequelize.define(
    'DaftarPotongan',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      mahasiswaId: { type: DataTypes.INTEGER, allowNull: false },
      biaya: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        get() {
          const value = this.getDataValue('biaya');
          return value === null ? null : Number(value);
        },
      },
      semester: { type: DataTypes.INTEGER, allowNull: true },
      alasan: { type: DataTypes.TEXT, allowNull: true },
      asal: { type: DataTypes.STRING(100), allowNull: true },
      createdBy: { type: DataTypes.INTEGER, allowNull: true },
      updatedBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: 'daftar_potongan',
      underscored: true,
      timestamps: true,
    }
  );

  DaftarPotongan.associate = (models) => {
    DaftarPotongan.belongsTo(models.Mahasiswa, { foreignKey: 'mahasiswaId', as: 'mahasiswa' });
    DaftarPotongan.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    DaftarPotongan.belongsTo(models.User, { foreignKey: 'updatedBy', as: 'updater' });
  };

  return DaftarPotongan;
};
