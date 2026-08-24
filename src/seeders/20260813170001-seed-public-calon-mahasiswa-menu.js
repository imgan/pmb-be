'use strict';

module.exports = {
  up: async (queryInterface) => {
    const [informasiRows] = await queryInterface.sequelize.query(
      "SELECT id, path FROM menus WHERE code = 'PUBLIC_FASILITAS' LIMIT 1"
    );
    const informasiMenu = informasiRows[0];
    const now = new Date();

    // "Informasi" jadi dropdown murni (tidak lagi link langsung ke anchor #fasilitas)
    await queryInterface.bulkUpdate('menus', { path: null }, { code: 'PUBLIC_FASILITAS' });

    await queryInterface.bulkInsert('menus', [
      {
        parent_id: informasiMenu.id,
        name: 'Fasilitas Kampus',
        code: 'PUBLIC_FASILITAS_KAMPUS',
        path: informasiMenu.path,
        icon: 'apartment',
        order_number: 1,
        is_active: true,
        is_public: true,
        created_at: now,
        updated_at: now,
      },
      {
        parent_id: informasiMenu.id,
        name: 'Data Calon Mahasiswa',
        code: 'PUBLIC_CALON_MAHASISWA',
        path: '/informasi/calon-mahasiswa',
        icon: 'groups',
        order_number: 2,
        is_active: true,
        is_public: true,
        created_at: now,
        updated_at: now,
      },
    ]);
  },
  down: async (queryInterface) => {
    const [informasiRows] = await queryInterface.sequelize.query(
      "SELECT id FROM menus WHERE code = 'PUBLIC_FASILITAS' LIMIT 1"
    );
    await queryInterface.bulkUpdate('menus', { path: '/#fasilitas' }, { code: 'PUBLIC_FASILITAS' });
    await queryInterface.bulkDelete('menus', { code: ['PUBLIC_FASILITAS_KAMPUS', 'PUBLIC_CALON_MAHASISWA'] });
    void informasiRows;
  },
};
