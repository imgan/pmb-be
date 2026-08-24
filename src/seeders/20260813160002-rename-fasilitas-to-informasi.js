'use strict';

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.bulkUpdate('menus', { name: 'Informasi' }, { code: 'PUBLIC_FASILITAS' });
  },
  down: async (queryInterface) => {
    await queryInterface.bulkUpdate('menus', { name: 'Fasilitas' }, { code: 'PUBLIC_FASILITAS' });
  },
};
