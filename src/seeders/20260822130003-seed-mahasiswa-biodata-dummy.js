'use strict';

const BIODATA = {
  D3FR20260001: { tempatLahir: 'Jakarta', tanggalLahir: '2002-03-14', noKtp: '3175011403020001', namaAyah: 'Bambang Adiyaksa', namaIbu: 'Sri Wahyuni' },
  D3FR20260002: { tempatLahir: 'Bekasi', tanggalLahir: '2002-07-22', noKtp: '3275012207020002', namaAyah: 'Hendra Ramadhani', namaIbu: 'Siti Aminah' },
  D3ML20260001: { tempatLahir: 'Bekasi', tanggalLahir: '2001-11-05', noKtp: '3275010511010003', namaAyah: 'Agus Wijaya', namaIbu: 'Ratna Sari' },
  D4TR20260001: { tempatLahir: 'Bogor', tanggalLahir: '2001-05-30', noKtp: '3271013005010004', namaAyah: 'Slamet Permana', namaIbu: 'Dewi Kusuma' },
  D3AR20260001: { tempatLahir: 'Bekasi', tanggalLahir: '2002-01-18', noKtp: '3275011801020005', namaAyah: 'Firman Syah', namaIbu: 'Yuli Astuti' },
  D3AR20260002: { tempatLahir: 'Depok', tanggalLahir: '2002-09-09', noKtp: '3276010909020006', namaAyah: 'Kusuma Wardhana', namaIbu: 'Nur Hasanah' },
};

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();
    for (const [nim, biodata] of Object.entries(BIODATA)) {
      const [mhsRows] = await queryInterface.sequelize.query(`SELECT id FROM mahasiswa WHERE nim = '${nim}' LIMIT 1`);
      if (mhsRows.length === 0) continue;
      const mahasiswaId = mhsRows[0].id;

      const [existing] = await queryInterface.sequelize.query(
        `SELECT id FROM mahasiswa_biodata WHERE mahasiswa_id = ${mahasiswaId} LIMIT 1`
      );
      if (existing.length > 0) continue;

      await queryInterface.bulkInsert('mahasiswa_biodata', [
        {
          mahasiswa_id: mahasiswaId,
          tempat_lahir: biodata.tempatLahir,
          tanggal_lahir: biodata.tanggalLahir,
          no_ktp: biodata.noKtp,
          nama_ayah: biodata.namaAyah,
          nama_ibu: biodata.namaIbu,
          kewarganegaraan: 'Indonesia',
          created_at: now,
          updated_at: now,
        },
      ]);
    }
  },
  down: async (queryInterface) => {
    const nims = Object.keys(BIODATA);
    const [mhsRows] = await queryInterface.sequelize.query(
      `SELECT id FROM mahasiswa WHERE nim IN (${nims.map((n) => `'${n}'`).join(', ')})`
    );
    if (mhsRows.length) {
      await queryInterface.bulkDelete('mahasiswa_biodata', { mahasiswa_id: mhsRows.map((r) => r.id) });
    }
  },
};
