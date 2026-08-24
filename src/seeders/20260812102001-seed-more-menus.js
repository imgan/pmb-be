'use strict';

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.bulkInsert('menus', [
      {
        name: 'Ukuran Almamater',
        code: 'UKURAN_ALMAMATER_MANAGEMENT',
        path: '/ukuran-almamater',
        icon: 'shirt',
        order_number: 8,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        name: 'Pembayaran',
        code: 'PEMBAYARAN_MANAGEMENT',
        path: '/pembayaran',
        icon: 'credit-card',
        order_number: 9,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        name: 'Dokumen Pendaftaran',
        code: 'DOKUMEN_PENDAFTARAN_MANAGEMENT',
        path: '/dokumen-pendaftaran',
        icon: 'file-text',
        order_number: 10,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        name: 'Dokumen Kelengkapan',
        code: 'DOKUMEN_KELENGKAPAN_MANAGEMENT',
        path: '/dokumen-kelengkapan',
        icon: 'paperclip',
        order_number: 11,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  },
  down: async (queryInterface) => {
    await queryInterface.bulkDelete('menus', {
      code: [
        'UKURAN_ALMAMATER_MANAGEMENT',
        'PEMBAYARAN_MANAGEMENT',
        'DOKUMEN_PENDAFTARAN_MANAGEMENT',
        'DOKUMEN_KELENGKAPAN_MANAGEMENT',
      ],
    });
  },
};
