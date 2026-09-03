module.exports = (sequelize, DataTypes) => {
  const TarifKuliah = sequelize.define(
    'TarifKuliah',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      jurusanId: { type: DataTypes.INTEGER, allowNull: false },
      tahunAngkatan: { type: DataTypes.INTEGER, allowNull: false },
      semester: { type: DataTypes.INTEGER, allowNull: false },
      biayaSks: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
        get() {
          const value = this.getDataValue('biayaSks');
          return value === null ? null : Number(value);
        },
      },
      biayaBpp: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
        get() {
          const value = this.getDataValue('biayaBpp');
          return value === null ? null : Number(value);
        },
      },
      biayaSpp: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
        get() {
          const value = this.getDataValue('biayaSpp');
          return value === null ? null : Number(value);
        },
      },
      statusBelajar: { type: DataTypes.STRING(30), allowNull: false },
      isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      periode: {
        type: DataTypes.VIRTUAL,
        get() {
          const tahunAngkatan = this.getDataValue('tahunAngkatan');
          return tahunAngkatan ? `${tahunAngkatan}/${tahunAngkatan + 1}` : null;
        },
      },
      createdBy: { type: DataTypes.INTEGER, allowNull: true },
      updatedBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: 'tarif_kuliah',
      underscored: true,
      timestamps: true,
    }
  );

  TarifKuliah.associate = (models) => {
    TarifKuliah.belongsTo(models.Jurusan, { foreignKey: 'jurusanId', as: 'jurusan' });
    TarifKuliah.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    TarifKuliah.belongsTo(models.User, { foreignKey: 'updatedBy', as: 'updater' });
  };

  return TarifKuliah;
};
