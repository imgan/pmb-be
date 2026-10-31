module.exports = (sequelize, DataTypes) => {
  const VirtualAccountMahasiswa = sequelize.define(
    'VirtualAccountMahasiswa',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      mahasiswaId: { type: DataTypes.INTEGER, allowNull: false },
      noVirtualAccount: { type: DataTypes.STRING(30), allowNull: false },
      // VA berlaku dari periodeOpen s.d. periodeClose (inklusif).
      periodeOpen: { type: DataTypes.DATEONLY, allowNull: false },
      periodeClose: { type: DataTypes.DATEONLY, allowNull: false },
      nominal: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
        get() {
          const value = this.getDataValue('nominal');
          return value === null ? null : Number(value);
        },
      },
      createdBy: { type: DataTypes.INTEGER, allowNull: true },
      updatedBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: 'virtual_account_mahasiswa',
      underscored: true,
      timestamps: true,
    }
  );

  VirtualAccountMahasiswa.associate = (models) => {
    VirtualAccountMahasiswa.belongsTo(models.Mahasiswa, { foreignKey: 'mahasiswaId', as: 'mahasiswa' });
  };

  return VirtualAccountMahasiswa;
};
