module.exports = (sequelize, DataTypes) => {
  const Dosen = sequelize.define(
    'Dosen',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      nik: { type: DataTypes.STRING(20), allowNull: true },
      nidn: { type: DataTypes.STRING(20), allowNull: false },
      namaLengkap: { type: DataTypes.STRING(150), allowNull: false },
      tempatLahir: { type: DataTypes.STRING(100), allowNull: true },
      tanggalLahir: { type: DataTypes.DATEONLY, allowNull: true },
      jenisKelamin: { type: DataTypes.ENUM('L', 'P'), allowNull: true },
      pendidikanAkhir: { type: DataTypes.STRING(50), allowNull: true },
      agama: { type: DataTypes.STRING(50), allowNull: true },
      telpHp: { type: DataTypes.STRING(30), allowNull: true },
      email: { type: DataTypes.STRING(150), allowNull: true },
      alamat: { type: DataTypes.TEXT, allowNull: true },
      statusDosen: { type: DataTypes.ENUM('TETAP', 'TIDAK_TETAP'), allowNull: true },
      status: { type: DataTypes.STRING(50), allowNull: true },
      waktu: { type: DataTypes.ENUM('M', 'P'), allowNull: true },
      tmt: { type: DataTypes.DATEONLY, allowNull: true },
      karyawanInternal: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      infaq: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      kelompokFakultas: {
        type: DataTypes.ENUM('FKF', 'FTID', 'FIP', 'NON_BASE'),
        allowNull: false,
        defaultValue: 'NON_BASE',
      },
      isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      isDelete: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      // Password untuk login mandiri di portal Dosen (terpisah dari sistem User/Role admin).
      // Nullable karena dosen lama belum tentu punya akun portal.
      password: { type: DataTypes.STRING(255), allowNull: true },
      createdBy: { type: DataTypes.INTEGER, allowNull: true },
      updatedBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: 'dosen',
      underscored: true,
      timestamps: true,
      defaultScope: { where: { isDelete: false }, attributes: { exclude: ['password'] } },
      scopes: { withDeleted: {}, withPassword: { attributes: { include: ['password'] } } },
    }
  );

  Dosen.associate = (models) => {
    Dosen.hasOne(models.VocUjianFtid, { foreignKey: 'dosenId', as: 'vocUjianFtid' });
    Dosen.hasMany(models.HonorUjianPembayaran, { foreignKey: 'dosenId', as: 'honorUjianPembayaranList' });
    Dosen.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    Dosen.belongsTo(models.User, { foreignKey: 'updatedBy', as: 'updater' });
  };

  return Dosen;
};
