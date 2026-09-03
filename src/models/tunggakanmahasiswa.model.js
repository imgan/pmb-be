module.exports = (sequelize, DataTypes) => {
  const TunggakanMahasiswa = sequelize.define(
    'TunggakanMahasiswa',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      mahasiswaId: { type: DataTypes.INTEGER, allowNull: false },
      tanggal: { type: DataTypes.DATEONLY, allowNull: false },
      nominal: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
        get() {
          const value = this.getDataValue('nominal');
          return value === null ? null : Number(value);
        },
      },
      // Konteks bebas mis. "Saldo awal migrasi dari SIA lama per Jan 2026" — sistem ini belum
      // punya ledger pembayaran per mahasiswa, jadi tunggakan dicatat manual sebagai saldo,
      // bukan dihitung otomatis dari tarif dikurangi riwayat pembayaran.
      keterangan: { type: DataTypes.TEXT, allowNull: true },
      createdBy: { type: DataTypes.INTEGER, allowNull: true },
      updatedBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: 'tunggakan_mahasiswa',
      underscored: true,
      timestamps: true,
    }
  );

  TunggakanMahasiswa.associate = (models) => {
    TunggakanMahasiswa.belongsTo(models.Mahasiswa, { foreignKey: 'mahasiswaId', as: 'mahasiswa' });
    TunggakanMahasiswa.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    TunggakanMahasiswa.belongsTo(models.User, { foreignKey: 'updatedBy', as: 'updater' });
  };

  return TunggakanMahasiswa;
};
