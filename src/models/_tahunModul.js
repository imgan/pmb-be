/**
 * Tahun Ajaran PMB (tahun_pmb) & Tahun Ajaran Keuangan (tahun_keuangan): data periode tersendiri per modul,
 * terpisah dari tahun akademik (tahun_ajaran); struktur sama, satu baris aktif per tabel (Modul Admin › Master).
 */
const definisi = (DataTypes) => ({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nama: { type: DataTypes.STRING(20), allowNull: false },
  tahunMulai: { type: DataTypes.INTEGER, allowNull: false },
  tahunSelesai: { type: DataTypes.INTEGER, allowNull: false },
  jenisSemester: { type: DataTypes.ENUM('GANJIL', 'GENAP'), allowNull: false, defaultValue: 'GANJIL' },
  isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  isDelete: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  createdBy: { type: DataTypes.INTEGER, allowNull: true },
  updatedBy: { type: DataTypes.INTEGER, allowNull: true },
});
const opsi = (tableName) => ({ tableName, underscored: true, timestamps: true, defaultScope: { where: { isDelete: false } }, scopes: { withDeleted: {} } });

/** Definisikan model tahun modul (dipakai tahunPmb.model.js & tahunKeuangan.model.js). */
module.exports = (sequelize, DataTypes, nama, tableName) => sequelize.define(nama, definisi(DataTypes), opsi(tableName));
