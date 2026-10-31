module.exports = (sequelize, DataTypes) => {
  const Dosen = sequelize.define(
    'Dosen',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      nik: { type: DataTypes.STRING(20), allowNull: true },
      nidn: { type: DataTypes.STRING(20), allowNull: false },
      namaLengkap: { type: DataTypes.STRING(150), allowNull: false },
      gelar: { type: DataTypes.STRING(100), allowNull: true },
      nuptk: { type: DataTypes.STRING(30), allowNull: true },
      // Prodi induk dosen ("Homebase") — terpisah dari kelompokFakultas (FKF/FTID/FIP/NON_BASE,
      // klasifikasi lama yang tidak cocok dengan struktur prodi Poltek Bhani).
      jurusanId: { type: DataTypes.INTEGER, allowNull: true },
      tempatLahir: { type: DataTypes.STRING(100), allowNull: true },
      tanggalLahir: { type: DataTypes.DATEONLY, allowNull: true },
      jenisKelamin: { type: DataTypes.ENUM('L', 'P'), allowNull: true },
      pendidikanAkhir: { type: DataTypes.STRING(50), allowNull: true },
      agama: { type: DataTypes.STRING(50), allowNull: true },
      telpHp: { type: DataTypes.STRING(30), allowNull: true },
      noWhatsapp: { type: DataTypes.STRING(30), allowNull: true },
      email: { type: DataTypes.STRING(150), allowNull: true },
      alamat: { type: DataTypes.TEXT, allowNull: true },
      statusDosen: { type: DataTypes.ENUM('TETAP', 'TIDAK_TETAP'), allowNull: true },
      // Jabatan fungsional (Asisten Ahli, Lektor, ...) & angka kredit KUM — dikelola SDM.
      jabatanFungsional: { type: DataTypes.STRING(50), allowNull: true },
      kum: {
        type: DataTypes.DECIMAL(8, 2),
        allowNull: true,
        get() {
          const v = this.getDataValue('kum');
          return v === null ? null : Number(v);
        },
      },
      // Internal = dosen homebase Poltek; Eksternal = dosen luar/LB (termasuk staf struktural yang ikut mengajar).
      jenisDosen: { type: DataTypes.ENUM('INTERNAL', 'EKSTERNAL'), allowNull: false, defaultValue: 'INTERNAL' },
      keterangan: { type: DataTypes.STRING(100), allowNull: true },
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
      // Foto profil (base64) — dikecualikan dari defaultScope supaya daftar dosen tetap ringan.
      photo: { type: DataTypes.TEXT('long'), allowNull: true },
      createdBy: { type: DataTypes.INTEGER, allowNull: true },
      updatedBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: 'dosen',
      underscored: true,
      timestamps: true,
      defaultScope: { where: { isDelete: false }, attributes: { exclude: ['password', 'photo'] } },
      scopes: { withDeleted: {}, withPassword: { attributes: { include: ['password'] } } },
    }
  );

  Dosen.associate = (models) => {
    Dosen.hasOne(models.VocUjianFtid, { foreignKey: 'dosenId', as: 'vocUjianFtid' });
    Dosen.hasMany(models.HonorUjianPembayaran, { foreignKey: 'dosenId', as: 'honorUjianPembayaranList' });
    Dosen.belongsTo(models.Jurusan, { foreignKey: 'jurusanId', as: 'jurusan' });
    Dosen.hasMany(models.RiwayatPendidikanDosen, { foreignKey: 'dosenId', as: 'riwayatPendidikan' });
    Dosen.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    Dosen.belongsTo(models.User, { foreignKey: 'updatedBy', as: 'updater' });
  };

  return Dosen;
};
