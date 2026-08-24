const { Op } = require('sequelize');
const { Karyawan, SyncFingerLog, DinasCutiLupaFinger } = require('../models');
const ApiError = require('../utils/ApiError');

const HARI_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

const SHIFT_START = {
  SHIFT_1: '08:00:00',
  SHIFT_2: '16:00:00',
  SHIFT_3: '00:00:00',
};

const STATUS_LABELS = {
  DINAS_LUAR: 'Dinas Luar',
  CUTI: 'Cuti',
  LUPA_KEHADIRAN: 'Lupa Kehadiran',
  CUTI_SPESIAL: 'Cuti Spesial',
  CUTI_BERSAMA: 'Cuti Bersama',
};

const toDateKey = (value) => new Date(value).toISOString().slice(0, 10);

const timeToSeconds = (date) => date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();

const formatHm = (date) => {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
};

const formatMenit = (minutes) => (minutes > 0 ? `${minutes} Menit` : '');

const getReportData = async (query) => {
  const { karyawanId, periodeAwal, periodeAkhir, shift } = query;
  if (!karyawanId) throw new ApiError(400, 'Karyawan wajib dipilih');
  if (!periodeAwal || !periodeAkhir) throw new ApiError(400, 'Periode awal dan akhir wajib diisi');
  const shiftKey = SHIFT_START[shift] ? shift : 'SHIFT_1';
  const [shH, shM, shS] = SHIFT_START[shiftKey].split(':').map(Number);
  const shiftStartSeconds = shH * 3600 + shM * 60 + shS;

  const karyawan = await Karyawan.findByPk(karyawanId);
  if (!karyawan) throw new ApiError(404, 'Karyawan tidak ditemukan');

  const startDate = new Date(`${periodeAwal}T00:00:00`);
  const endDate = new Date(`${periodeAkhir}T23:59:59`);

  const [logs, cutiRows] = await Promise.all([
    SyncFingerLog.findAll({
      where: { karyawanId, tanggal: { [Op.between]: [startDate, endDate] } },
      order: [['tanggal', 'ASC']],
    }),
    DinasCutiLupaFinger.findAll({
      where: { karyawanId, tanggalKehadiran: { [Op.between]: [periodeAwal, periodeAkhir] } },
    }),
  ]);

  const cutiByDate = new Map(cutiRows.map((c) => [toDateKey(c.tanggalKehadiran), STATUS_LABELS[c.status] ?? c.status]));

  const byDate = new Map();
  logs.forEach((log) => {
    const key = toDateKey(log.tanggal);
    const scanTime = new Date(log.tanggal);
    const entry = byDate.get(key);
    if (!entry) {
      byDate.set(key, { first: scanTime, last: scanTime });
    } else {
      if (scanTime < entry.first) entry.first = scanTime;
      if (scanTime > entry.last) entry.last = scanTime;
    }
  });

  const rows = [];
  let terlambatMinutesTotal = 0;
  let jumlahJamTotal = 0;

  Array.from(byDate.keys())
    .sort()
    .forEach((dateKey) => {
      const { first, last } = byDate.get(dateKey);
      const tanggal = new Date(`${dateKey}T00:00:00`);
      const jamMasukSeconds = timeToSeconds(first);
      const terlambatMenit = Math.max(0, Math.floor((jamMasukSeconds - shiftStartSeconds) / 60));
      const jumlahJam = Math.max(0, (last.getTime() - first.getTime()) / 3600000);

      terlambatMinutesTotal += terlambatMenit;
      jumlahJamTotal += jumlahJam;

      rows.push({
        hari: HARI_ID[tanggal.getDay()],
        tanggal: dateKey,
        status: cutiByDate.get(dateKey) ?? '',
        jamMasuk: formatHm(first),
        terlambatMenit,
        terlambatLabel: formatMenit(terlambatMenit),
        jamKeluar: formatHm(last),
        pulangCepatLabel: '',
        jumlahJam: Number(jumlahJam.toFixed(2)),
      });
    });

  const terlambatHoursTotal = terlambatMinutesTotal / 60;
  const grandTotalJam = jumlahJamTotal - terlambatHoursTotal;

  const days = Math.round((endDate - startDate) / 86400000) + 1;
  const weeks = Math.max(1, Math.ceil(days / 7));
  const normalJam = weeks * 40;

  return {
    karyawan: { id: karyawan.id, namaLengkap: karyawan.namaLengkap, bagian: karyawan.bagian },
    periodeAwal,
    periodeAkhir,
    shift: shiftKey,
    rows,
    totalTerlambatHours: Number(terlambatHoursTotal.toFixed(2)),
    totalJumlahJam: Number(jumlahJamTotal.toFixed(2)),
    grandTotalJam: Number(grandTotalJam.toFixed(2)),
    normalJam,
    weeks,
  };
};

module.exports = { getReportData, SHIFT_START, STATUS_LABELS };
