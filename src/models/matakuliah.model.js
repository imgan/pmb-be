/**
 * Mata kuliah milik satu kurikulum (kurikulumId) — Kurikulum 1 ──< N MataKuliah. Prodi & tahun
 * kurikulum diambil dari kurikulum induknya (include `kurikulum`). Dipakai jadwal kuliah,
 * matakuliah aktif, konversi kurikulum, silabus (portal dosen) & feeder.
 */
module.exports = (sequelize, DataTypes) => {
  const MataKuliah = sequelize.define(
    'MataKuliah',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      kurikulumId: { type: DataTypes.INTEGER, allowNull: false },
      kode: { type: DataTypes.STRING(30), allowNull: false },
      mataKuliah: { type: DataTypes.STRING(200), allowNull: false },
      mataKuliahEn: { type: DataTypes.STRING(200), allowNull: true },
      kelompokMataKuliah: { type: DataTypes.ENUM('MPK', 'MKK', 'MKB', 'MPB', 'MBB'), allowNull: true },
      kelompokKurikulum: { type: DataTypes.ENUM('WAJIB', 'PILIHAN'), allowNull: true },
      jenisMataKuliah: { type: DataTypes.ENUM('TEORI', 'PRAKTIK', 'TEORI_PRAKTIK'), allowNull: true },
      sksTeori: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      sksPraktek: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      sksLab: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      sksSimulasi: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      kelompokKompetensi: { type: DataTypes.ENUM('UTAMA', 'PENDUKUNG', 'LAINNYA'), allowNull: true },
      kompIlmuKomputer: { type: DataTypes.STRING(100), allowNull: true },
      mataKuliahMinat: { type: DataTypes.STRING(100), allowNull: true },
      muatanMataKuliah: { type: DataTypes.STRING(255), allowNull: true },
      metodePembelajaran: { type: DataTypes.STRING(100), allowNull: true },
      // Id mata kuliah di Neo Feeder PDDIKTI.
      idMatkul: { type: DataTypes.STRING(30), allowNull: true },
      semester: { type: DataTypes.INTEGER, allowNull: true },
      // Mata kuliah berbasis OBE (Outcome-Based Education) atau non-OBE.
      isObe: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      // Target capaian MK OBE (Setting Kurikulum), 0–100; null untuk MK non-OBE.
      targetCpl: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        get() {
          const v = this.getDataValue('targetCpl');
          return v === null || v === undefined ? null : Number(v);
        },
      },
      targetCpmk: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        get() {
          const v = this.getDataValue('targetCpmk');
          return v === null || v === undefined ? null : Number(v);
        },
      },
      // RPS → Pemetaan CPMK: level baris (CPMK induk / Sub-CPMK) & metode pembobotan CPMK → CPL.
      levelPemetaanCpmk: { type: DataTypes.ENUM('CPMK', 'SUB_CPMK'), allowNull: false, defaultValue: 'CPMK' },
      metodeBobotCpmk: { type: DataTypes.ENUM('MANUAL', 'OTOMATIS'), allowNull: false, defaultValue: 'OTOMATIS' },
      // Deskripsi silabus, ditampilkan read-only di halaman "Silabus Matakuliah" portal Dosen.
      silabus: { type: DataTypes.TEXT, allowNull: true },
      // Ikon ilustrasi kartu kelas E-learning (kunci tema, mis. 'database'); null = otomatis dari nama.
      ikon: { type: DataTypes.STRING(40), allowNull: true },
      sksTotal: {
        type: DataTypes.VIRTUAL,
        get() {
          return (this.sksTeori ?? 0) + (this.sksPraktek ?? 0) + (this.sksLab ?? 0) + (this.sksSimulasi ?? 0);
        },
      },
      // Alias kompatibel untuk konsumen lama master mata kuliah (kodeMk / namaMk / sks).
      kodeMk: {
        type: DataTypes.VIRTUAL,
        get() {
          return this.getDataValue('kode');
        },
      },
      namaMk: {
        type: DataTypes.VIRTUAL,
        get() {
          return this.getDataValue('mataKuliah');
        },
      },
      sks: {
        type: DataTypes.VIRTUAL,
        get() {
          return this.sksTotal;
        },
      },
      isDelete: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      createdBy: { type: DataTypes.INTEGER, allowNull: true },
      updatedBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: 'mata_kuliah',
      underscored: true,
      timestamps: true,
      defaultScope: { where: { isDelete: false } },
      scopes: { withDeleted: {} },
    }
  );

  /** Kolom SQL yang dibutuhkan untuk membaca kode/nama/SKS (dipakai saat `attributes` dibatasi). */
  MataKuliah.ATTRS_RINGKAS = ['id', 'kurikulumId', 'kode', 'mataKuliah', 'semester', 'sksTeori', 'sksPraktek', 'sksLab', 'sksSimulasi'];

  MataKuliah.associate = (models) => {
    MataKuliah.belongsTo(models.Kurikulum, { foreignKey: 'kurikulumId', as: 'kurikulum' });
    MataKuliah.hasMany(models.JadwalKuliah, { foreignKey: 'mataKuliahId', as: 'kelasKuliahList' });
    MataKuliah.hasMany(models.MatakuliahAktif, { foreignKey: 'mataKuliahId', as: 'aktifList' });
    MataKuliah.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    MataKuliah.belongsTo(models.User, { foreignKey: 'updatedBy', as: 'updater' });
  };

  return MataKuliah;
};
