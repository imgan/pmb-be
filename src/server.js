require('dotenv').config();
// Jam lokal aplikasi = WIB, apa pun zona waktu servernya (server deploy biasanya UTC). Banyak catatan
// memakai jam lokal server (mis. jam masuk/keluar start-stop kelas, tanggal hari ini), jadi tanpa ini
// server UTC mencatat jam mundur 7 jam. Bisa ditimpa lewat TZ di .env.
process.env.TZ = process.env.TZ || 'Asia/Jakarta';
const app = require('./app');
const { sequelize } = require('./models');

const PORT = process.env.PORT || 3000;

const start = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection established');

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Swagger docs available at http://localhost:${PORT}/api-docs`);
    });
  } catch (err) {
    console.error('Unable to start server:', err);
    process.exit(1);
  }
};

start();
