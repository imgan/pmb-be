const { Sequelize } = require('sequelize');
const config = require('./config')[process.env.NODE_ENV || 'development'];

const sequelize = new Sequelize(config.database, config.username, config.password, {
  host: config.host,
  port: config.port,
  dialect: config.dialect,
  logging: config.logging,
  // Server MySQL (hosting bersama, diakses remote) memutus koneksi idle setelah wait_timeout = 20 detik
  // dan sesekali lambat menerima koneksi baru. Tanpa pengaturan ini, koneksi pool yang sudah diputus
  // server dipakai ulang (read ECONNRESET) dan koneksi baru gagal di 10 detik (connect ETIMEDOUT).
  // Hosting juga membatasi 500 koneksi BARU per jam per user (max_connections_per_hour), jadi pool
  // dibuat kecil dan 1 koneksi dijaga tetap hidup lewat keep-alive (lihat bawah) alih-alih dibuka-tutup.
  pool: {
    max: 5,
    min: 1,
    idle: 15000, // buang koneksi ekstra yang idle > 15 dtk, sebelum diputus server (20 dtk)
    evict: 5000, // cek koneksi idle tiap 5 dtk
    acquire: 60000, // tunggu slot pool / koneksi baru sampai 60 dtk sebelum menyerah
  },
  dialectOptions: {
    connectTimeout: 30000,
  },
  // Ulangi query bila gagal karena koneksi (belum sampai dieksekusi server), maks. 3x dengan jeda bertahap.
  // Batas koneksi per jam (ER_USER_LIMIT_REACHED) TIDAK di-retry: percobaan ulang hanya menghabiskan kuota.
  retry: {
    match: [
      /ETIMEDOUT/,
      /ECONNRESET/,
      /ECONNREFUSED/,
      /EHOSTUNREACH/,
      /PROTOCOL_CONNECTION_LOST/,
      /^(?!.*(max_connections_per_hour|ER_USER_LIMIT_REACHED)).*SequelizeConnectionError/,
      /SequelizeConnectionAcquireTimeoutError/,
      /Can't add new command when connection is in closed state/,
    ],
    max: 3,
    backoffBase: 500,
    backoffExponent: 1.5,
  },
});

// Keep-alive: ping tiap 12 dtk supaya koneksi pool (min: 1) tidak diputus server karena idle 20 dtk,
// sehingga request berikutnya memakai koneksi yang sama, bukan membuka koneksi baru. unref() agar
// script one-off tetap bisa selesai sendiri.
setInterval(() => {
  sequelize.query('SELECT 1').catch(() => {});
}, 12000).unref();

module.exports = sequelize;
