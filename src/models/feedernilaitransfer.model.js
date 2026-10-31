// Nilai Transfer untuk Feeder PDDIKTI: mata kuliah dari PT/prodi asal beserta mata kuliah yang
// diakui di prodi ini.
module.exports = (sequelize, DataTypes) => {
  const FeederNilaiTransfer = sequelize.define(
    'FeederNilaiTransfer',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      mahasiswaId: { type: DataTypes.INTEGER, allowNull: false },
      kodeMkAsal: { type: DataTypes.STRING(30), allowNull: false },
      namaMkAsal: { type: DataTypes.STRING(200), allowNull: false },
      sksAsal: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      nilaiHurufAsal: { type: DataTypes.STRING(3), allowNull: true },
      mataKuliahId: { type: DataTypes.INTEGER, allowNull: false },
      nilaiHurufDiakui: { type: DataTypes.STRING(3), allowNull: false },
      nilaiAngkaDiakui: {
        type: DataTypes.DECIMAL(4, 2),
        allowNull: false,
        get() {
          const raw = this.getDataValue('nilaiAngkaDiakui');
          return raw === null || raw === undefined ? null : Number(raw);
        },
      },
      createdBy: { type: DataTypes.INTEGER, allowNull: true },
      updatedBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    { tableName: 'feeder_nilai_transfer', underscored: true, timestamps: true }
  );

  FeederNilaiTransfer.associate = (models) => {
    FeederNilaiTransfer.belongsTo(models.Mahasiswa, { foreignKey: 'mahasiswaId', as: 'mahasiswa' });
    FeederNilaiTransfer.belongsTo(models.MataKuliah, { foreignKey: 'mataKuliahId', as: 'mataKuliah' });
  };

  return FeederNilaiTransfer;
};
