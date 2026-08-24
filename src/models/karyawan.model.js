module.exports = (sequelize, DataTypes) => {
  const Karyawan = sequelize.define(
    'Karyawan',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      nip: { type: DataTypes.STRING(20), allowNull: false, unique: true },
      idFinger: { type: DataTypes.STRING(30), allowNull: true },
      namaLengkap: { type: DataTypes.STRING(150), allowNull: false },
      tempatLahir: { type: DataTypes.STRING(100), allowNull: true },
      tanggalLahir: { type: DataTypes.DATEONLY, allowNull: true },
      jenisKelamin: { type: DataTypes.ENUM('L', 'P'), allowNull: true },
      pendidikanAkhir: { type: DataTypes.STRING(50), allowNull: true },
      agama: { type: DataTypes.STRING(50), allowNull: true },
      telpHp: { type: DataTypes.STRING(30), allowNull: true },
      email: { type: DataTypes.STRING(150), allowNull: true },
      alamat: { type: DataTypes.TEXT, allowNull: true },
      bagian: { type: DataTypes.STRING(100), allowNull: true },
      jabatan: { type: DataTypes.STRING(100), allowNull: true },
      status: { type: DataTypes.STRING(50), allowNull: true },
      tmt: { type: DataTypes.DATEONLY, allowNull: true },
      isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      isDelete: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      createdBy: { type: DataTypes.INTEGER, allowNull: true },
      updatedBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: 'karyawan',
      underscored: true,
      timestamps: true,
      defaultScope: { where: { isDelete: false } },
      scopes: { withDeleted: {} },
    }
  );

  Karyawan.associate = (models) => {
    Karyawan.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    Karyawan.belongsTo(models.User, { foreignKey: 'updatedBy', as: 'updater' });
  };

  return Karyawan;
};
