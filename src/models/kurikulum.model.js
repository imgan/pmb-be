/**
 * Kurikulum (header) satu prodi pada satu tahun kurikulum, mis. "Kurikulum 2026 D3 Farmasi".
 * Satu kurikulum memiliki banyak mata kuliah (MataKuliah.kurikulumId) — one-to-many.
 */
module.exports = (sequelize, DataTypes) => {
  const Kurikulum = sequelize.define(
    'Kurikulum',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      jurusanId: { type: DataTypes.INTEGER, allowNull: true },
      // Tahun kurikulum (2020, 2023, 2026, ...). Beberapa kurikulum bisa berjalan dalam satu semester.
      tahunKurikulum: { type: DataTypes.INTEGER, allowNull: true },
      nama: { type: DataTypes.STRING(150), allowNull: false },
      tanggalMulaiEfektif: { type: DataTypes.DATEONLY, allowNull: true },
      tanggalAkhirEfektif: { type: DataTypes.DATEONLY, allowNull: true },
      keterangan: { type: DataTypes.TEXT, allowNull: true },
      // Metode pembobotan pemetaan PL → CPL: MANUAL (diisi sendiri) / OTOMATIS (rata per PL).
      metodeBobotPlCpl: { type: DataTypes.ENUM('MANUAL', 'OTOMATIS'), allowNull: false, defaultValue: 'OTOMATIS' },
      // Level pemetaan CPL → MK: CPL (sampai CPL induk) / IK (sampai Indikator Kinerja).
      levelPemetaanCplMk: { type: DataTypes.ENUM('CPL', 'IK'), allowNull: false, defaultValue: 'CPL' },
      isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      isDelete: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      createdBy: { type: DataTypes.INTEGER, allowNull: true },
      updatedBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: 'kurikulum',
      underscored: true,
      timestamps: true,
      defaultScope: { where: { isDelete: false } },
      scopes: { withDeleted: {} },
    }
  );

  Kurikulum.associate = (models) => {
    Kurikulum.belongsTo(models.Jurusan, { foreignKey: 'jurusanId', as: 'jurusan' });
    Kurikulum.hasMany(models.MataKuliah, { foreignKey: 'kurikulumId', as: 'mataKuliahList' });
    Kurikulum.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    Kurikulum.belongsTo(models.User, { foreignKey: 'updatedBy', as: 'updater' });
  };

  return Kurikulum;
};
