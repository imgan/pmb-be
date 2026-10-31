module.exports = (sequelize, DataTypes) => {
  const TagihanCicilan = sequelize.define(
    'TagihanCicilan',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      tagihanKuliahId: { type: DataTypes.INTEGER, allowNull: false },
      cicilanKe: { type: DataTypes.INTEGER, allowNull: false },
      // Bulan tagihan (tanggal 1 bulan tsb).
      periode: { type: DataTypes.DATEONLY, allowNull: false },
      nominal: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
        get() {
          const value = this.getDataValue('nominal');
          return value === null ? null : Number(value);
        },
      },
      tanggalJatuhTempo: { type: DataTypes.DATEONLY, allowNull: true },
      noVirtualAccount: { type: DataTypes.STRING(30), allowNull: true },
      keterangan: { type: DataTypes.STRING(255), allowNull: true },
      createdBy: { type: DataTypes.INTEGER, allowNull: true },
      updatedBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: 'tagihan_cicilan',
      underscored: true,
      timestamps: true,
    }
  );

  TagihanCicilan.associate = (models) => {
    TagihanCicilan.belongsTo(models.TagihanKuliah, { foreignKey: 'tagihanKuliahId', as: 'tagihan' });
  };

  return TagihanCicilan;
};
