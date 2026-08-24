'use strict';

const CHILDREN = [
  { name: 'Nilai Perkelas', code: 'PRODI_NILAI_PERKELAS_MANAGEMENT', path: '/nilai/nilai-perkelas', icon: 'grading' },
  { name: 'Nilai Mahasiswa', code: 'PRODI_NILAI_MAHASISWA_MANAGEMENT', path: '/nilai/nilai-mahasiswa', icon: 'school' },
  { name: 'Nilai Magang', code: 'PRODI_NILAI_MAGANG_MANAGEMENT', path: '/nilai/nilai-magang', icon: 'work' },
  { name: 'Konversi Nilai Pindah/RPL', code: 'PRODI_KONVERSI_NILAI_MANAGEMENT', path: '/nilai/konversi-nilai', icon: 'sync_alt' },
  { name: 'Penghapusan Nilai', code: 'PRODI_PENGHAPUSAN_NILAI_MANAGEMENT', path: '/nilai/penghapusan-nilai', icon: 'delete_sweep' },
  { name: 'Update Nilai', code: 'PRODI_UPDATE_NILAI_MANAGEMENT', path: '/nilai/update-nilai', icon: 'edit_note' },
  { name: 'Voc Dosen (FTID)', code: 'PRODI_VOC_DOSEN_FTID_MANAGEMENT', path: '/nilai/voc-dosen-ftid', icon: 'record_voice_over' },
  { name: 'Bobot OBE', code: 'PRODI_BOBOT_OBE_MANAGEMENT', path: '/nilai/bobot-obe', icon: 'balance' },
  { name: 'Voc Ujian (FTID)', code: 'PRODI_VOC_UJIAN_FTID_MANAGEMENT', path: '/nilai/voc-ujian-ftid', icon: 'quiz' },
];

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();

    await queryInterface.bulkInsert('menus', [
      {
        parent_id: null,
        name: 'Nilai',
        code: 'PRODI_NILAI_MANAGEMENT',
        path: null,
        icon: 'grading',
        order_number: 6,
        is_active: true,
        is_public: false,
        module: 'prodi',
        created_at: now,
        updated_at: now,
      },
    ]);

    const [rows] = await queryInterface.sequelize.query("SELECT id FROM menus WHERE code = 'PRODI_NILAI_MANAGEMENT' LIMIT 1");
    const nilaiGroupId = rows[0].id;

    await queryInterface.bulkInsert(
      'menus',
      CHILDREN.map((child, index) => ({
        parent_id: nilaiGroupId,
        name: child.name,
        code: child.code,
        path: child.path,
        icon: child.icon,
        order_number: index + 1,
        is_active: true,
        is_public: false,
        module: 'prodi',
        created_at: now,
        updated_at: now,
      }))
    );
  },
  down: async (queryInterface) => {
    await queryInterface.bulkDelete('menus', { code: CHILDREN.map((c) => c.code) });
    await queryInterface.bulkDelete('menus', { code: ['PRODI_NILAI_MANAGEMENT'] });
  },
};
