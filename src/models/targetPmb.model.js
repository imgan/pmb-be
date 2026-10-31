/** Target mahasiswa baru per prodi (kode prodi) per tahun ajaran PMB — dipakai panel Pencapaian di dashboard PMB. */
module.exports = (sequelize, DataTypes) => {
  const TargetPmb = sequelize.define(
    'TargetPmb',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      tahunPmbId: { type: DataTypes.INTEGER, allowNull: false },
      kodeProdi: { type: DataTypes.STRING(20), allowNull: false },
      target: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      createdBy: { type: DataTypes.INTEGER, allowNull: true },
      updatedBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    { tableName: 'target_pmb', underscored: true, timestamps: true }
  );

  TargetPmb.associate = (models) => {
    TargetPmb.belongsTo(models.TahunPmb, { foreignKey: 'tahunPmbId', as: 'tahunPmb' });
  };

  return TargetPmb;
};
