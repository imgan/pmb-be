'use strict';

const WEEKDAY_TIMES = [
  { masuk: '08:19:30', keluar: '16:10:09' },
  { masuk: '08:23:09', keluar: '16:25:44' },
  { masuk: '08:19:42', keluar: '16:20:19' },
  { masuk: '08:31:19', keluar: '16:12:58' },
  { masuk: '08:17:31', keluar: '16:15:09' },
  { masuk: '08:36:18', keluar: '16:44:09' },
  { masuk: '08:18:09', keluar: '17:01:03' },
  { masuk: '08:18:20', keluar: '17:13:28' },
  { masuk: '08:09:13', keluar: '16:42:24' },
  { masuk: '08:14:44', keluar: '16:43:49' },
  { masuk: '08:23:48', keluar: '17:40:22' },
  { masuk: '08:15:20', keluar: '20:55:41' },
  { masuk: '08:22:45', keluar: '17:16:51' },
  { masuk: '08:01:30', keluar: '17:23:13' },
];

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();
    const [karyawanRows] = await queryInterface.sequelize.query(
      "SELECT id, id_finger FROM karyawan WHERE nip = 'K0001' LIMIT 1"
    );
    if (!karyawanRows.length) return;
    const karyawan = karyawanRows[0];

    const skipDates = ['2026-08-17'];
    const dates = [];
    const cursor = new Date('2026-08-03');
    const end = new Date('2026-08-21');
    while (cursor <= end) {
      const day = cursor.getDay();
      const dateStr = cursor.toISOString().slice(0, 10);
      if (day !== 0 && day !== 6 && !skipDates.includes(dateStr)) {
        dates.push(dateStr);
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    const logRows = [];
    dates.forEach((dateStr, idx) => {
      const times = WEEKDAY_TIMES[idx % WEEKDAY_TIMES.length];
      logRows.push({
        mesin: 'A1',
        nik: karyawan.id_finger,
        tanggal: new Date(`${dateStr}T${times.masuk}`),
        karyawan_id: karyawan.id,
        status: 'PROCESSED',
        processed_at: now,
        created_by: null,
        updated_by: null,
        created_at: now,
        updated_at: now,
      });
      logRows.push({
        mesin: 'A1',
        nik: karyawan.id_finger,
        tanggal: new Date(`${dateStr}T${times.keluar}`),
        karyawan_id: karyawan.id,
        status: 'PROCESSED',
        processed_at: now,
        created_by: null,
        updated_by: null,
        created_at: now,
        updated_at: now,
      });
    });

    await queryInterface.bulkInsert('sync_finger_log', logRows);

    await queryInterface.bulkInsert('dinas_cuti_lupa_finger', [
      {
        karyawan_id: karyawan.id,
        tanggal_kehadiran: '2026-08-17',
        status: 'CUTI',
        keperluan: 'Cuti tahunan',
        created_by: null,
        updated_by: null,
        created_at: now,
        updated_at: now,
      },
    ]);
  },
  down: async (queryInterface) => {
    const [karyawanRows] = await queryInterface.sequelize.query("SELECT id FROM karyawan WHERE nip = 'K0001' LIMIT 1");
    if (!karyawanRows.length) return;
    const karyawanId = karyawanRows[0].id;
    await queryInterface.bulkDelete('sync_finger_log', { karyawan_id: karyawanId });
    await queryInterface.bulkDelete('dinas_cuti_lupa_finger', { karyawan_id: karyawanId, status: 'CUTI', tanggal_kehadiran: '2026-08-17' });
  },
};
