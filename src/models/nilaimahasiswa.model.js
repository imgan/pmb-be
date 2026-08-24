module.exports = (sequelize, DataTypes) => {
  const decimalField = (fieldName) => ({
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 0,
    get() {
      const raw = this.getDataValue(fieldName);
      return raw === null ? null : Number(raw);
    },
  });

  const NilaiMahasiswa = sequelize.define(
    'NilaiMahasiswa',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      mahasiswaId: { type: DataTypes.INTEGER, allowNull: false },
      kodeMataKuliah: { type: DataTypes.STRING(30), allowNull: false },
      namaMataKuliah: { type: DataTypes.STRING(150), allowNull: false },
      sks: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      semester: { type: DataTypes.INTEGER, allowNull: false },
      partisipatif: decimalField('partisipatif'),
      proyek: decimalField('proyek'),
      quiz: decimalField('quiz'),
      tugas: decimalField('tugas'),
      uts: decimalField('uts'),
      uas: decimalField('uas'),
      nilai: decimalField('nilai'),
      grade: { type: DataTypes.STRING(2), allowNull: false, defaultValue: 'E' },
    },
    {
      tableName: 'nilai_mahasiswa',
      underscored: true,
      timestamps: true,
    }
  );

  NilaiMahasiswa.associate = (models) => {
    NilaiMahasiswa.belongsTo(models.Mahasiswa, { foreignKey: 'mahasiswaId', as: 'mahasiswa' });
  };

  return NilaiMahasiswa;
};
