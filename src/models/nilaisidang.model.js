module.exports = (sequelize, DataTypes) => {
  const NilaiSidang = sequelize.define(
    'NilaiSidang',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      pendaftarSidangId: { type: DataTypes.INTEGER, allowNull: false },
      peran: {
        type: DataTypes.ENUM('PEMBIMBING_1', 'PEMBIMBING_2', 'PENGUJI_1', 'PENGUJI_2'),
        allowNull: false,
      },
      // Dosen yang menginput nilai — dicatat terpisah dari peran supaya tetap jelas siapa
      // yang menilai walau pembimbing/penguji pendaftar diganti belakangan.
      dosenId: { type: DataTypes.INTEGER, allowNull: false },
      nilai: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        get() {
          const raw = this.getDataValue('nilai');
          return raw === null ? null : Number(raw);
        },
      },
      grade: { type: DataTypes.STRING(2), allowNull: false },
    },
    {
      tableName: 'nilai_sidang',
      underscored: true,
      timestamps: true,
    }
  );

  NilaiSidang.associate = (models) => {
    NilaiSidang.belongsTo(models.PendaftarSidang, { foreignKey: 'pendaftarSidangId', as: 'pendaftarSidang' });
    NilaiSidang.belongsTo(models.Dosen, { foreignKey: 'dosenId', as: 'dosen' });
  };

  return NilaiSidang;
};
