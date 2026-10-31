'use strict';

// Tabel data Feeder PDDIKTI yang belum punya padanan di data akademik sistem (AKM, Kelulusan,
// Nilai Transfer). Data lain (Mahasiswa, Matakuliah, Kelas, KRS, Dosen Ajar, Nilai) dibaca
// langsung dari tabel akademik yang sudah ada.
const auditColumns = (Sequelize) => ({
  created_by: {
    type: Sequelize.INTEGER,
    allowNull: true,
    references: { model: 'users', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  },
  updated_by: {
    type: Sequelize.INTEGER,
    allowNull: true,
    references: { model: 'users', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  },
  created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
  updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
});

const mahasiswaFk = (Sequelize) => ({
  type: Sequelize.INTEGER,
  allowNull: false,
  references: { model: 'mahasiswa', key: 'id' },
  onUpdate: 'CASCADE',
  onDelete: 'CASCADE',
});

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Aktivitas Kuliah Mahasiswa per periode (mis. 20261 = 2026/2027 Ganjil).
    await queryInterface.createTable('feeder_akm', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      mahasiswa_id: mahasiswaFk(Sequelize),
      periode: { type: Sequelize.STRING(5), allowNull: false },
      status_mahasiswa: { type: Sequelize.STRING(1), allowNull: false, defaultValue: 'A' },
      ips: { type: Sequelize.DECIMAL(4, 2), allowNull: false, defaultValue: 0 },
      ipk: { type: Sequelize.DECIMAL(4, 2), allowNull: false, defaultValue: 0 },
      sks_semester: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      sks_total: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      biaya_kuliah: { type: Sequelize.DECIMAL(14, 2), allowNull: true },
      ...auditColumns(Sequelize),
    });
    await queryInterface.addIndex('feeder_akm', ['mahasiswa_id', 'periode'], { unique: true, name: 'feeder_akm_mhs_periode_unique' });

    // Mahasiswa Lulus / Drop Out — satu baris per mahasiswa.
    await queryInterface.createTable('feeder_kelulusan', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      mahasiswa_id: { ...mahasiswaFk(Sequelize), unique: true },
      jenis_keluar: { type: Sequelize.STRING(1), allowNull: false, defaultValue: '1' },
      tanggal_keluar: { type: Sequelize.DATEONLY, allowNull: true },
      periode_keluar: { type: Sequelize.STRING(5), allowNull: true },
      no_sk_yudisium: { type: Sequelize.STRING(100), allowNull: true },
      tanggal_sk_yudisium: { type: Sequelize.DATEONLY, allowNull: true },
      ipk: { type: Sequelize.DECIMAL(4, 2), allowNull: true },
      no_ijazah: { type: Sequelize.STRING(100), allowNull: true },
      judul_skripsi: { type: Sequelize.TEXT, allowNull: true },
      bulan_awal_bimbingan: { type: Sequelize.DATEONLY, allowNull: true },
      bulan_akhir_bimbingan: { type: Sequelize.DATEONLY, allowNull: true },
      keterangan: { type: Sequelize.TEXT, allowNull: true },
      ...auditColumns(Sequelize),
    });

    // Nilai Transfer (pengakuan mata kuliah dari PT/prodi asal).
    await queryInterface.createTable('feeder_nilai_transfer', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      mahasiswa_id: mahasiswaFk(Sequelize),
      kode_mk_asal: { type: Sequelize.STRING(30), allowNull: false },
      nama_mk_asal: { type: Sequelize.STRING(200), allowNull: false },
      sks_asal: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      nilai_huruf_asal: { type: Sequelize.STRING(3), allowNull: true },
      mata_kuliah_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'mata_kuliah', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      nilai_huruf_diakui: { type: Sequelize.STRING(3), allowNull: false },
      nilai_angka_diakui: { type: Sequelize.DECIMAL(4, 2), allowNull: false },
      ...auditColumns(Sequelize),
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('feeder_nilai_transfer');
    await queryInterface.dropTable('feeder_kelulusan');
    await queryInterface.dropTable('feeder_akm');
  },
};
