module.exports = (sequelize, DataTypes) => {
  const AngketPelayananJawaban = sequelize.define(
    'AngketPelayananJawaban',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      mahasiswaId: { type: DataTypes.INTEGER, allowNull: false },
      tahunAjaranId: { type: DataTypes.INTEGER, allowNull: false },
      // { [pertanyaanId]: skor 1–5 }
      jawaban: {
        type: DataTypes.JSON,
        allowNull: false,
        get() {
          const raw = this.getDataValue('jawaban');
          return typeof raw === 'string' ? JSON.parse(raw) : raw;
        },
      },
      saran: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      tableName: 'angket_pelayanan_jawaban',
      underscored: true,
      timestamps: true,
    }
  );

  AngketPelayananJawaban.associate = (models) => {
    AngketPelayananJawaban.belongsTo(models.Mahasiswa, { foreignKey: 'mahasiswaId', as: 'mahasiswa' });
    AngketPelayananJawaban.belongsTo(models.TahunAjaran, { foreignKey: 'tahunAjaranId', as: 'tahunAjaran' });
  };

  return AngketPelayananJawaban;
};
