'use strict';

// Keringanan bisa dipilih berlaku untuk KRS / UTS / UAS (syarat akhir semester: UAS, nilai, KHS)
// dan dibatasi sampai tanggal tertentu — lewat tanggal itu keringanan tidak dihitung lagi saat cek cekal.
// Default true untuk ketiganya agar keringanan lama tetap berlaku seperti sebelumnya.
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('keringanan', 'berlaku_krs', { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true, after: 'jumlah_bayar' });
    await queryInterface.addColumn('keringanan', 'berlaku_uts', { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true, after: 'berlaku_krs' });
    await queryInterface.addColumn('keringanan', 'berlaku_uas', { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true, after: 'berlaku_uts' });
    await queryInterface.addColumn('keringanan', 'sampai_tanggal', { type: Sequelize.DATEONLY, allowNull: true, after: 'berlaku_uas' });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('keringanan', 'sampai_tanggal');
    await queryInterface.removeColumn('keringanan', 'berlaku_uas');
    await queryInterface.removeColumn('keringanan', 'berlaku_uts');
    await queryInterface.removeColumn('keringanan', 'berlaku_krs');
  },
};
