/**
 * One-off maintenance script: set every Mahasiswa's portal login password to their own NIM
 * (bcrypt-hashed), so the 355 mahasiswa imported from Excel (which have no password) can log
 * in to the mahasiswa portal at /mahasiswa/login. NIM itself is unaffected — only the
 * `password` column is set/overwritten.
 *
 * Run with: node scripts/set-mahasiswa-password-to-nim.js
 */
const bcrypt = require('bcryptjs');
const { Mahasiswa } = require('../src/models');

const main = async () => {
  const rows = await Mahasiswa.scope('withPassword').findAll({ attributes: ['id', 'nim'] });
  console.log(`Mengatur password untuk ${rows.length} mahasiswa...`);

  let count = 0;
  for (const row of rows) {
    const hashed = await bcrypt.hash(row.nim, 10);
    await row.update({ password: hashed });
    count += 1;
    if (count % 50 === 0) console.log(`  ...${count}/${rows.length}`);
  }

  console.log(`Selesai: ${count} password diatur (password = NIM masing-masing).`);
  process.exit(0);
};

main().catch((err) => {
  console.error('GAGAL:', err);
  process.exit(1);
});
