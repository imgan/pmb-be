'use strict';

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();
    await queryInterface.bulkUpdate(
      'menus',
      { order_number: 6, updated_at: now },
      { code: 'NILAI_MONITORING_MANAGEMENT' }
    );
    await queryInterface.bulkUpdate(
      'menus',
      { order_number: 7, updated_at: now },
      { code: 'BAAK_AUDIT_LOG_MANAGEMENT' }
    );
  },
  down: async (queryInterface) => {
    const now = new Date();
    await queryInterface.bulkUpdate(
      'menus',
      { order_number: 6, updated_at: now },
      { code: 'BAAK_AUDIT_LOG_MANAGEMENT' }
    );
    await queryInterface.bulkUpdate(
      'menus',
      { order_number: 7, updated_at: now },
      { code: 'NILAI_MONITORING_MANAGEMENT' }
    );
  },
};
