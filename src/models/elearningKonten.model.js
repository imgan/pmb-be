const { parseTagline, bersihkanTagline } = require('../utils/elearningTagline');

// E-learning: konten per kelas (MATERI / VIDEO / KUIS) yang di-assign dosen ke mahasiswa kelasnya.
module.exports = (sequelize, DataTypes) => {
  const ElearningKonten = sequelize.define(
    'ElearningKonten',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      jadwalKuliahId: { type: DataTypes.INTEGER, allowNull: false },
      dosenId: { type: DataTypes.INTEGER, allowNull: false },
      jenis: { type: DataTypes.ENUM('MATERI', 'VIDEO', 'KUIS', 'TUGAS'), allowNull: false },
      judul: { type: DataTypes.STRING(200), allowNull: false },
      // Kategori konten (mis. Kuliah, Praktikum) & tagline badge sorotan (mis. Wajib, Baru).
      kategori: { type: DataTypes.STRING(50), allowNull: true },
      // Tagline bisa lebih dari satu — disimpan sebagai array JSON (mis. ["Wajib","Baru"]).
      tagline: {
        type: DataTypes.STRING(500),
        allowNull: true,
        get() {
          return parseTagline(this.getDataValue('tagline'));
        },
        set(v) {
          const list = bersihkanTagline(v);
          this.setDataValue('tagline', list.length ? JSON.stringify(list) : null);
        },
      },
      // Konten wajib (harus dibaca / ditonton / dikerjakan) atau opsional.
      isWajib: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      // Konten (kelas yang sama) yang harus diselesaikan dulu sebelum konten ini bisa dibuka mahasiswa.
      prasyaratId: { type: DataTypes.INTEGER, allowNull: true },
      deskripsi: { type: DataTypes.TEXT, allowNull: true },
      isi: { type: DataTypes.TEXT('long'), allowNull: true },
      url: { type: DataTypes.STRING(500), allowNull: true },
      // Materi: link video YouTube / Google Drive (bisa lebih dari satu) — array JSON.
      videoUrls: {
        type: DataTypes.TEXT,
        allowNull: true,
        get() {
          try {
            const v = JSON.parse(this.getDataValue('videoUrls') || '[]');
            return Array.isArray(v) ? v : [];
          } catch {
            return [];
          }
        },
        set(v) {
          const list = (Array.isArray(v) ? v : []).map((x) => String(x ?? '').trim()).filter(Boolean);
          this.setDataValue('videoUrls', list.length ? JSON.stringify(list) : null);
        },
      },
      lampiran: { type: DataTypes.TEXT('long'), allowNull: true },
      lampiranNama: { type: DataTypes.STRING(255), allowNull: true },
      pertemuanKe: { type: DataTypes.INTEGER, allowNull: true },
      tenggat: { type: DataTypes.DATE, allowNull: true },
      // Kuis: durasi pengerjaan (menit, sejak mulai; null = tanpa batas), acak urutan soal, tampilkan nilai ke mahasiswa.
      durasiMenit: { type: DataTypes.INTEGER, allowNull: true },
      acakSoal: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      tampilkanHasil: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      // SEMUA = peserta kelas, PILIHAN = mahasiswa tertentu, KAMPUS = semua mahasiswa aktif di kampus, GRUP = dibagi per grup.
      target: { type: DataTypes.ENUM('SEMUA', 'PILIHAN', 'KAMPUS', 'GRUP'), allowNull: false, defaultValue: 'SEMUA' },
      // Periode tayang untuk mahasiswa (null = tanpa batas).
      tersediaMulai: { type: DataTypes.DATE, allowNull: true },
      tersediaSampai: { type: DataTypes.DATE, allowNull: true },
      isPublished: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    { tableName: 'elearning_konten', underscored: true, timestamps: true }
  );

  ElearningKonten.associate = (models) => {
    ElearningKonten.belongsTo(models.JadwalKuliah, { foreignKey: 'jadwalKuliahId', as: 'jadwalKuliah' });
    ElearningKonten.belongsTo(models.Dosen, { foreignKey: 'dosenId', as: 'dosen' });
    ElearningKonten.hasMany(models.ElearningKontenMahasiswa, { foreignKey: 'kontenId', as: 'penerima' });
    ElearningKonten.hasMany(models.ElearningSoal, { foreignKey: 'kontenId', as: 'soal' });
    ElearningKonten.hasMany(models.ElearningJawaban, { foreignKey: 'kontenId', as: 'jawaban' });
    ElearningKonten.belongsTo(models.ElearningKonten, { foreignKey: 'prasyaratId', as: 'prasyarat' });
    ElearningKonten.hasMany(models.ElearningProgres, { foreignKey: 'kontenId', as: 'progres' });
    ElearningKonten.hasMany(models.ElearningKontenBerkas, { foreignKey: 'kontenId', as: 'berkas' });
  };

  return ElearningKonten;
};
