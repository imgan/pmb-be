/**
 * Setting Program Studi per periode (tahun ajaran) — modul Prodi → tombol "Setting Prodi".
 * Tab: KRS & Validasi, KHS & Nilai, Ujian, Lain-lain.
 */
module.exports = (sequelize, DataTypes) => {
  const tgl = { type: DataTypes.DATEONLY, allowNull: true };
  const ya = (def = false) => ({ type: DataTypes.BOOLEAN, allowNull: false, defaultValue: def });
  const SettingProdi = sequelize.define(
    'SettingProdi',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      jurusanId: { type: DataTypes.INTEGER, allowNull: false },
      tahunAjaranId: { type: DataTypes.INTEGER, allowNull: false },
      kurikulumMahasiswaBaruId: { type: DataTypes.INTEGER, allowNull: true },
      // KRS & Validasi
      bukaKrs: ya(),
      tanggalAwalKrs: tgl,
      tanggalAkhirKrs: tgl,
      tanggalAwalPerubahanKrs: tgl,
      tanggalAkhirPerubahanKrs: tgl,
      wajibValidasiPa: ya(true),
      cekTagihanKrs: ya(),
      maksSks: { type: DataTypes.INTEGER, allowNull: true },
      // KHS & Nilai
      bukaKhs: ya(),
      tanggalAwalKhs: tgl,
      tanggalAkhirKhs: tgl,
      tanggalCetakKhs: tgl,
      bukaPengisianNilai: ya(),
      dosenIsiPersentaseKomponen: ya(),
      tanggalAwalPengisianNilai: tgl,
      tanggalAkhirPengisianNilai: tgl,
      // Ujian
      bukaCetakKartuUjian: ya(),
      cekTagihanUjian: ya(),
      minKehadiranUts: { type: DataTypes.INTEGER, allowNull: true },
      minKehadiranUas: { type: DataTypes.INTEGER, allowNull: true },
      // Lain-lain
      keterangan: { type: DataTypes.TEXT, allowNull: true },
      createdBy: { type: DataTypes.INTEGER, allowNull: true },
      updatedBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    { tableName: 'setting_prodi', underscored: true, timestamps: true }
  );

  /** Kolom isian setting (selain kunci prodi + periode & audit). */
  SettingProdi.FIELDS = Object.keys(SettingProdi.rawAttributes).filter(
    (k) => !['id', 'jurusanId', 'tahunAjaranId', 'createdBy', 'updatedBy', 'createdAt', 'updatedAt'].includes(k)
  );

  SettingProdi.associate = (models) => {
    SettingProdi.belongsTo(models.Jurusan, { foreignKey: 'jurusanId', as: 'jurusan' });
    SettingProdi.belongsTo(models.TahunAjaran, { foreignKey: 'tahunAjaranId', as: 'tahunAjaran' });
    SettingProdi.belongsTo(models.Kurikulum, { foreignKey: 'kurikulumMahasiswaBaruId', as: 'kurikulumMahasiswaBaru' });
  };

  return SettingProdi;
};
