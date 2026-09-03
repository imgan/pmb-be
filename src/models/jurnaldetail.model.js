module.exports = (sequelize, DataTypes) => {
  const decimalField = (fieldName) => ({
    type: DataTypes.DECIMAL(14, 2),
    allowNull: false,
    defaultValue: 0,
    get() {
      const value = this.getDataValue(fieldName);
      return value === null ? null : Number(value);
    },
  });

  const JurnalDetail = sequelize.define(
    'JurnalDetail',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      jurnalId: { type: DataTypes.INTEGER, allowNull: false },
      akunId: { type: DataTypes.INTEGER, allowNull: false },
      debit: decimalField('debit'),
      kredit: decimalField('kredit'),
    },
    {
      tableName: 'jurnal_detail',
      underscored: true,
      timestamps: true,
    }
  );

  JurnalDetail.associate = (models) => {
    JurnalDetail.belongsTo(models.Jurnal, { foreignKey: 'jurnalId', as: 'jurnal' });
    JurnalDetail.belongsTo(models.Akun, { foreignKey: 'akunId', as: 'akun' });
  };

  return JurnalDetail;
};
