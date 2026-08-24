module.exports = (sequelize, DataTypes) => {
  const Peserta = sequelize.define(
    'Peserta',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      namaLengkap: { type: DataTypes.STRING(150), allowNull: false },
      asalSekolah: { type: DataTypes.STRING(150), allowNull: false },
      golonganKelasId: { type: DataTypes.INTEGER, allowNull: false },
      jurusanId: { type: DataTypes.INTEGER, allowNull: false },
      noTelepon: { type: DataTypes.STRING(20), allowNull: false },
      email: { type: DataTypes.STRING(100), allowNull: false, unique: true, validate: { isEmail: true } },
      password: { type: DataTypes.STRING(255), allowNull: false },
      isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      statusUjian: {
        type: DataTypes.ENUM('belum_ujian', 'lulus', 'tidak_lulus'),
        allowNull: false,
        defaultValue: 'belum_ujian',
      },
      statusKelulusan: {
        type: DataTypes.ENUM('menunggu', 'diterima', 'ditolak'),
        allowNull: false,
        defaultValue: 'menunggu',
      },
      resetPasswordToken: { type: DataTypes.STRING(255), allowNull: true },
      resetPasswordExpires: { type: DataTypes.DATE, allowNull: true },
      createdBy: { type: DataTypes.INTEGER, allowNull: true },
      updatedBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: 'peserta',
      underscored: true,
      timestamps: true,
      paranoid: true,
      defaultScope: { attributes: { exclude: ['password', 'resetPasswordToken', 'resetPasswordExpires'] } },
      scopes: {
        withPassword: { attributes: { include: ['password'] } },
        withResetToken: { attributes: { include: ['resetPasswordToken', 'resetPasswordExpires', 'password'] } },
      },
    }
  );

  Peserta.associate = (models) => {
    Peserta.belongsTo(models.GolonganKelas, { foreignKey: 'golonganKelasId', as: 'golonganKelas' });
    Peserta.belongsTo(models.Jurusan, { foreignKey: 'jurusanId', as: 'jurusan' });
    Peserta.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    Peserta.belongsTo(models.User, { foreignKey: 'updatedBy', as: 'updater' });
    Peserta.hasOne(models.PesertaBiodata, { foreignKey: 'pesertaId', as: 'biodata' });
    Peserta.hasMany(models.PesertaDokumen, { foreignKey: 'pesertaId', as: 'dokumen' });
    Peserta.hasOne(models.Mahasiswa, { foreignKey: 'pesertaId', as: 'mahasiswa' });
  };

  return Peserta;
};
