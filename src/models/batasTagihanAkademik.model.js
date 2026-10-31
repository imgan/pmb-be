const decimalGetter = (field) =>
  function get() {
    const value = this.getDataValue(field);
    return value === null ? null : Number(value);
  };

/**
 * Alur cekal per prodi (dalam PERSEN, 0–100), dihitung dari tagihan semester berjalan yang dicicil
 * 6x per bulan (lihat batasTagihanAkademik.service getAksesMahasiswa): minBayarKrs/minBayarUts = persen
 * tagihan semester yang sudah dibayar, minBayarNilai = persen cicilan jatuh tempo s/d bulan berjalan.
 * Kesepakatan: KRS 15% (1 bulan), UTS 50% (3 bulan), Nilai 100% cicilan s/d bulan berjalan.
 */
module.exports = (sequelize, DataTypes) => {
  const BatasTagihanAkademik = sequelize.define(
    'BatasTagihanAkademik',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      jurusanId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
      krsAktif: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      minBayarKrs: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0, get: decimalGetter('minBayarKrs') },
      utsAktif: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      minBayarUts: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0, get: decimalGetter('minBayarUts') },
      nilaiAktif: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      minBayarNilai: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0, get: decimalGetter('minBayarNilai') },
      createdBy: { type: DataTypes.INTEGER, allowNull: true },
      updatedBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: 'batas_tagihan_akademik',
      underscored: true,
      timestamps: true,
    }
  );

  BatasTagihanAkademik.associate = (models) => {
    BatasTagihanAkademik.belongsTo(models.Jurusan, { foreignKey: 'jurusanId', as: 'jurusan' });
    BatasTagihanAkademik.belongsTo(models.User, { foreignKey: 'updatedBy', as: 'updater' });
  };

  return BatasTagihanAkademik;
};
