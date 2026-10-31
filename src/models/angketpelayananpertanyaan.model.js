module.exports = (sequelize, DataTypes) => {
  const AngketPelayananPertanyaan = sequelize.define(
    'AngketPelayananPertanyaan',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      kategori: { type: DataTypes.STRING(100), allowNull: true },
      pertanyaan: { type: DataTypes.TEXT, allowNull: false },
      urutan: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    {
      tableName: 'angket_pelayanan_pertanyaan',
      underscored: true,
      timestamps: true,
    }
  );

  return AngketPelayananPertanyaan;
};
