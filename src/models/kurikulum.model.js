module.exports = (sequelize, DataTypes) => {
  const Kurikulum = sequelize.define(
    'Kurikulum',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      jurusanId: { type: DataTypes.INTEGER, allowNull: true },
      tahunAjaranId: { type: DataTypes.INTEGER, allowNull: true },
      kode: { type: DataTypes.STRING(30), allowNull: false },
      mataKuliah: { type: DataTypes.STRING(200), allowNull: false },
      mataKuliahEn: { type: DataTypes.STRING(200), allowNull: true },
      kelompokMataKuliah: {
        type: DataTypes.ENUM('MPK', 'MKK', 'MKB', 'MPB', 'MBB'),
        allowNull: true,
      },
      kelompokKurikulum: {
        type: DataTypes.ENUM('WAJIB', 'PILIHAN'),
        allowNull: true,
      },
      jenisMataKuliah: {
        type: DataTypes.ENUM('TEORI', 'PRAKTIK', 'TEORI_PRAKTIK'),
        allowNull: true,
      },
      sksTeori: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      sksPraktek: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      sksLab: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      sksSimulasi: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      kelompokKompetensi: {
        type: DataTypes.ENUM('UTAMA', 'PENDUKUNG', 'LAINNYA'),
        allowNull: true,
      },
      kompIlmuKomputer: { type: DataTypes.STRING(100), allowNull: true },
      mataKuliahMinat: { type: DataTypes.STRING(100), allowNull: true },
      muatanMataKuliah: { type: DataTypes.STRING(255), allowNull: true },
      semester: { type: DataTypes.INTEGER, allowNull: true },
      sksTotal: {
        type: DataTypes.VIRTUAL,
        get() {
          return (this.sksTeori ?? 0) + (this.sksPraktek ?? 0) + (this.sksLab ?? 0) + (this.sksSimulasi ?? 0);
        },
      },
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
    Kurikulum.belongsTo(models.TahunAjaran, { foreignKey: 'tahunAjaranId', as: 'tahunAjaran' });
    Kurikulum.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    Kurikulum.belongsTo(models.User, { foreignKey: 'updatedBy', as: 'updater' });
  };

  return Kurikulum;
};
