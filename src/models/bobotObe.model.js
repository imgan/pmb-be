module.exports = (sequelize, DataTypes) => {
  const persen = (field) => ({
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 0,
    get() {
      const v = this.getDataValue(field);
      return v === null ? 0 : Number(v);
    },
  });

  const BobotObe = sequelize.define(
    'BobotObe',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      jadwalKuliahId: { type: DataTypes.INTEGER, allowNull: false },
      partisipatif: persen('partisipatif'),
      tugas: persen('tugas'),
      quiz: persen('quiz'),
      proyek: persen('proyek'),
      uts: persen('uts'),
      uas: persen('uas'),
      // Rincian Komponen Evaluasi [{ metode, jenis, bobot, syaratLulus }]; kolom persen di atas = jumlah per jenis.
      komponenEvaluasi: {
        type: DataTypes.JSON,
        allowNull: true,
        get() {
          const v = this.getDataValue('komponenEvaluasi');
          if (typeof v !== 'string') return v ?? null;
          try {
            return JSON.parse(v);
          } catch {
            return null;
          }
        },
      },
      keterangan: { type: DataTypes.TEXT, allowNull: true },
      dosenId: { type: DataTypes.INTEGER, allowNull: true },
      updatedBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: 'bobot_obe',
      underscored: true,
      timestamps: true,
    }
  );

  BobotObe.associate = (models) => {
    BobotObe.belongsTo(models.JadwalKuliah, { foreignKey: 'jadwalKuliahId', as: 'jadwalKuliah' });
    BobotObe.belongsTo(models.Dosen, { foreignKey: 'dosenId', as: 'dosen' });
    BobotObe.belongsTo(models.User, { foreignKey: 'updatedBy', as: 'updater' });
  };

  return BobotObe;
};
