'use strict';

module.exports = {
  up: async (queryInterface) => {
    const [pesertaList] = await queryInterface.sequelize.query(
      "SELECT id, email FROM peserta WHERE email IN ('ahmad.fauzi@example.com', 'siti.nurhaliza@example.com')"
    );
    const pesertaMap = {};
    pesertaList.forEach((p) => {
      pesertaMap[p.email] = p.id;
    });
    const now = new Date();

    await queryInterface.bulkInsert('peserta_biodata', [
      {
        peserta_id: pesertaMap['ahmad.fauzi@example.com'],
        tempat_lahir: 'Jakarta',
        tanggal_lahir: '2007-05-12',
        jenis_kelamin: 'L',
        agama: 'Islam',
        kewarganegaraan: 'Indonesia',
        nik: '3171051205070001',
        nama_ibu_kandung: 'Siti Aminah',
        jalan: 'Jl. Merdeka No. 10',
        rt: '001',
        rw: '002',
        desa_kelurahan: 'Menteng',
        provinsi: 'DKI Jakarta',
        kabupaten: 'Jakarta Pusat',
        kecamatan: 'Menteng',
        kode_pos: '10310',
        no_whatsapp: '081234567001',
        is_agree: true,
        created_at: now,
        updated_at: now,
      },
      {
        peserta_id: pesertaMap['siti.nurhaliza@example.com'],
        tempat_lahir: 'Bandung',
        tanggal_lahir: '2007-09-20',
        jenis_kelamin: 'P',
        agama: 'Islam',
        kewarganegaraan: 'Indonesia',
        nik: '3273092009070002',
        nama_ibu_kandung: 'Ratna Sari',
        jalan: 'Jl. Asia Afrika No. 25',
        rt: '003',
        rw: '004',
        desa_kelurahan: 'Braga',
        provinsi: 'Jawa Barat',
        kabupaten: 'Bandung',
        kecamatan: 'Sumur Bandung',
        kode_pos: '40111',
        no_whatsapp: '081234567002',
        is_agree: true,
        created_at: now,
        updated_at: now,
      },
    ]);
  },
  down: async (queryInterface) => {
    await queryInterface.bulkDelete('peserta_biodata', { nik: ['3171051205070001', '3273092009070002'] });
  },
};
