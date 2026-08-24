module.exports = {
  up: async (queryInterface) => {
    const now = new Date();
    await queryInterface.bulkInsert('menus', [
      {
        parent_id: null,
        name: 'Master Lulusan',
        code: 'PRODI_LULUSAN_MANAGEMENT',
        path: '/lulusan',
        icon: 'workspace_premium',
        order_number: 2,
        is_active: true,
        is_public: false,
        module: 'prodi',
        created_at: now,
        updated_at: now,
      },
    ]);
  },
  down: async (queryInterface) => {
    await queryInterface.bulkDelete('menus', { code: ['PRODI_LULUSAN_MANAGEMENT'] });
  },
};
