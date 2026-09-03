module.exports = (sequelize, DataTypes) => {
  const Akun = sequelize.define(
    'Akun',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      kode: { type: DataTypes.STRING(20), allowNull: false, unique: true },
      nama: { type: DataTypes.STRING(150), allowNull: false },
      kategori: {
        type: DataTypes.ENUM('ASET', 'KEWAJIBAN', 'EKUITAS', 'PENDAPATAN', 'BEBAN'),
        allowNull: false,
      },
      saldoNormal: { type: DataTypes.ENUM('DEBIT', 'KREDIT'), allowNull: false },
      isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    {
      tableName: 'akun',
      underscored: true,
      timestamps: true,
    }
  );

  Akun.associate = (models) => {
    Akun.hasMany(models.JurnalDetail, { foreignKey: 'akunId', as: 'jurnalDetailList' });
  };

  return Akun;
};
