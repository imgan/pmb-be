'use strict';

const GELAR_BY_NAMA = {
  'D3 Farmasi': {
    jenjangPendidikan: 'Diploma Tiga',
    gelarSingkat: 'A.Md.Farm.',
    gelarLengkap: 'Ahli Madya Farmasi',
    namaFakultas: 'Fakultas Kesehatan dan Farmasi',
  },
  'D3 Administrasi Rumah Sakit': {
    jenjangPendidikan: 'Diploma Tiga',
    gelarSingkat: 'A.Md.Kes.',
    gelarLengkap: 'Ahli Madya Kesehatan',
    namaFakultas: 'Fakultas Kesehatan dan Farmasi',
  },
  'D3 Manajemen Logistik': {
    jenjangPendidikan: 'Diploma Tiga',
    gelarSingkat: 'A.Md.',
    gelarLengkap: 'Ahli Madya Manajemen Logistik',
    namaFakultas: 'Fakultas Ekonomi dan Bisnis',
  },
  'D4 Teknologi Rekayasa Multimedia': {
    jenjangPendidikan: 'Diploma Empat',
    gelarSingkat: 'S.Tr.Kom.',
    gelarLengkap: 'Sarjana Terapan Komputer',
    namaFakultas: 'Fakultas Teknologi Informasi dan Digital',
  },
};

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();
    for (const [namaJurusan, gelar] of Object.entries(GELAR_BY_NAMA)) {
      await queryInterface.bulkUpdate(
        'jurusan',
        {
          jenjang_pendidikan: gelar.jenjangPendidikan,
          gelar_singkat: gelar.gelarSingkat,
          gelar_lengkap: gelar.gelarLengkap,
          nama_fakultas: gelar.namaFakultas,
          updated_at: now,
        },
        { nama_jurusan: namaJurusan }
      );
    }
  },
  down: async (queryInterface) => {
    await queryInterface.bulkUpdate(
      'jurusan',
      { jenjang_pendidikan: null, gelar_singkat: null, gelar_lengkap: null, nama_fakultas: null },
      { nama_jurusan: Object.keys(GELAR_BY_NAMA) }
    );
  },
};
