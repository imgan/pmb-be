module.exports = (sequelize, DataTypes) => {
  const DinasCutiLupaFinger = sequelize.define(
    'DinasCutiLupaFinger',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      karyawanId: { type: DataTypes.INTEGER, allowNull: false },
      tanggalKehadiran: { type: DataTypes.DATEONLY, allowNull: false },
      status: {
        type: DataTypes.ENUM('DINAS_LUAR', 'CUTI', 'LUPA_KEHADIRAN', 'CUTI_SPESIAL', 'CUTI_BERSAMA'),
        allowNull: false,
      },
      keperluan: { type: DataTypes.TEXT, allowNull: true },
      lampiranNama: { type: DataTypes.STRING(255), allowNull: true },
      lampiran: { type: DataTypes.TEXT('long'), allowNull: true },
      createdBy: { type: DataTypes.INTEGER, allowNull: true },
      updatedBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: 'dinas_cuti_lupa_finger',
      underscored: true,
      timestamps: true,
    }
  );

  DinasCutiLupaFinger.associate = (models) => {
    DinasCutiLupaFinger.belongsTo(models.Karyawan, { foreignKey: 'karyawanId', as: 'karyawan' });
    DinasCutiLupaFinger.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    DinasCutiLupaFinger.belongsTo(models.User, { foreignKey: 'updatedBy', as: 'updater' });
  };

  return DinasCutiLupaFinger;
};
