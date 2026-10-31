module.exports = (sequelize, DataTypes) => {
  // Master pertanyaan angket dosen per Periode Akademik & Tk. Pendidikan, dikelompokkan per kategori.
  const AngketDosenPertanyaan = sequelize.define(
    'AngketDosenPertanyaan',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      tahunAjaranId: { type: DataTypes.INTEGER, allowNull: false },
      jenjangPendidikan: { type: DataTypes.STRING(50), allowNull: false },
      kategori: { type: DataTypes.STRING(100), allowNull: true },
      pertanyaan: { type: DataTypes.TEXT, allowNull: false },
      openQuestion: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      urutan: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      createdBy: { type: DataTypes.INTEGER, allowNull: true },
      updatedBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: 'angket_dosen_pertanyaan',
      underscored: true,
      timestamps: true,
    }
  );

  AngketDosenPertanyaan.associate = (models) => {
    AngketDosenPertanyaan.belongsTo(models.TahunAjaran, { foreignKey: 'tahunAjaranId', as: 'tahunAjaran' });
  };

  return AngketDosenPertanyaan;
};
