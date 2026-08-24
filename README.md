# PMB Backend API

Template CRUD master data (Auth JWT, User, Role akses, Menu/RBAC, Jurusan, Golongan Kelas) menggunakan Express, Sequelize (MySQL), dan Swagger.

## Stack

- Express.js
- Sequelize ORM + `sequelize-cli` migrations (MySQL, via `mysql2`)
- JWT (access token + refresh token) untuk autentikasi
- RBAC: Role -> Menu -> Permission (`can_create`, `can_read`, `can_update`, `can_delete`) per menu
- Swagger (`swagger-jsdoc` + `swagger-ui-express`) di `/api-docs`
- Validasi request dengan Joi
- Password hashing dengan bcryptjs
- Audit trail (`created_by`/`updated_by`, FK ke `users.id`) di semua tabel
- Soft delete (`is_delete`) di tabel `jurusan` dan `golongan_kelas`

## Struktur Folder

```
src/
  config/       # config DB (sequelize-cli), koneksi sequelize, swagger definition
  constants/    # kode menu & action (create/read/update/delete)
  controllers/  # HTTP layer, tipis, panggil services
  services/     # business logic & query sequelize
  models/       # model sequelize + associasi
  middlewares/  # auth (JWT), authorize (RBAC), validate, error handler
  validations/  # Joi schema
  routes/       # express router + anotasi swagger
  migrations/   # sequelize-cli migrations (skema tabel)
  seeders/      # sequelize-cli seeders (data awal)
  app.js        # express app setup
  server.js     # entry point
```

## Setup

1. Install dependencies

   ```
   npm install
   ```

2. Copy `.env.example` ke `.env`, sesuaikan koneksi MySQL & secret JWT.

   ```
   cp .env.example .env
   ```

3. Buat database MySQL sesuai `DB_NAME` di `.env` (mis. `pmb_db`).

4. Jalankan migration untuk membuat tabel `roles`, `menus`, `users`, `role_menu_permissions`, kolom audit (`created_by`/`updated_by`) di keempat tabel tersebut, serta tabel `golongan_kelas` dan `jurusan`.

   ```
   npm run db:migrate
   ```

5. Jalankan seeder untuk data awal (2 role, 6 menu, 1 user superadmin, full permission untuk SUPERADMIN atas semua menu termasuk Golongan Kelas & Jurusan).

   ```
   npm run db:seed
   ```

6. Jalankan server.

   ```
   npm run dev
   ```

7. Buka dokumentasi API di `http://localhost:3000/api-docs`.

## Kredensial Default (dari seeder)

- username: `superadmin`
- password: `Password123!`

Ganti password ini setelah login pertama kali di environment production.

## Alur RBAC (Role - Menu - Permission)

1. Setiap `User` punya satu `Role`.
2. Setiap `Menu` adalah unit modul/halaman (bisa nested via `parent_id`), diidentifikasi dengan `code` unik (mis. `USER_MANAGEMENT`).
3. Tabel pivot `role_menu_permissions` menyimpan hak akses (`can_create/read/update/delete`) per kombinasi role & menu.
4. Middleware `authorize(menuCode, action)` di setiap route mengecek apakah role user memiliki hak akses tersebut sebelum request diproses.
5. Endpoint `GET /api/roles/:roleId/permissions` dan `PUT /api/roles/:roleId/permissions` dipakai untuk mengatur hak akses menu per role dari halaman admin.
6. Endpoint `GET /api/menus/tree` mengembalikan menu dalam bentuk nested tree untuk render sidebar di frontend.

## Audit Trail

Setiap tabel (`roles`, `menus`, `users`, `role_menu_permissions`, `golongan_kelas`, `jurusan`) punya kolom `created_by` dan `updated_by` (integer, nullable, FK ke `users.id`, `ON DELETE SET NULL`). Kolom ini otomatis diisi dari `req.user.id` (user yang sedang login lewat JWT) di layer service setiap kali record dibuat/diubah — tidak perlu dikirim dari client.

## Master Data Sumber Informasi

- `sumber_informasi`: `id`, `nama_informasi`, `created_by`, `updated_by`.
- Tidak ada soft delete di modul ini — `DELETE` menghapus baris secara permanen (hard delete), sama seperti pola `roles`/`menus`.

## Master Data Ukuran Almamater, Pembayaran, Dokumen Pendaftaran & Dokumen Kelengkapan

- `ukuran_almamater`: `id`, `ukuran`, `created_by`, `updated_by`. Hard delete.
- `pembayaran`: `id`, `nama_pembayaran`, `is_beasiswa` (boolean), `created_by`, `updated_by`. Hard delete. List bisa difilter `?isBeasiswa=true`.
- `dokumen_pendaftaran`: `id`, `nama_pendaftaran`, `is_wajib` (boolean), `created_by`, `updated_by`. Hard delete. List bisa difilter `?isWajib=true`.
- `dokumen_kelengkapan`: `id`, `nama_kelengkapan`, `is_wajib` (boolean), `is_beasiswa` (boolean), `file` (kolom `LONGTEXT`, berisi string base64 — boleh dikirim polos atau dengan prefix `data:<mime>;base64,`), `created_by`, `updated_by`. Hard delete.
  - `GET /api/dokumen-kelengkapan` (list) **tidak** menyertakan kolom `file` supaya payload list tetap ringan.
  - `GET /api/dokumen-kelengkapan/:id` (detail) menyertakan `file` secara lengkap.
  - Body limit Express dinaikkan ke `BODY_LIMIT` (default `15mb`, lihat `.env`) supaya request dengan file base64 tidak ditolak `PayloadTooLargeError`. Sesuaikan nilainya kalau file yang diunggah lebih besar.

## Master Data Gelombang

- `gelombang`: `id`, `nama_gelombang`, `start_date`, `end_date` (keduanya kolom `DATE`, tanpa jam), `deskripsi` (nullable), `created_by`, `updated_by`. Hard delete.
- Validasi: `endDate` harus >= `startDate`, dicek baik saat create (Joi) maupun update (service, karena update bisa partial dan perlu dibandingkan dengan nilai lama).
- List diurutkan berdasarkan `startDate` terbaru.

## Master Data Jurusan & Golongan Kelas

- `golongan_kelas`: `id`, `nama_kelas`, `is_delete` (soft delete), `created_by`, `updated_by`.
- `jurusan`: `id`, `golongan_kelas_id` (FK -> `golongan_kelas.id`, `ON DELETE RESTRICT`), `nama_jurusan`, `is_delete`, `created_by`, `updated_by`.
- Relasi: **satu golongan kelas memiliki banyak jurusan** (`GolonganKelas.hasMany(Jurusan)` / `Jurusan.belongsTo(GolonganKelas)`).
- Delete pada kedua modul ini adalah **soft delete**: `DELETE` hanya men-set `is_delete = true` (bukan hapus baris), dan query list/detail secara default menyaring baris yang `is_delete = true`.
- List jurusan bisa difilter per golongan kelas lewat query param `?golonganKelasId=`.

## Endpoint Utama

| Method | Endpoint | Keterangan |
|---|---|---|
| POST | /api/auth/login | Login, dapat access token & refresh token |
| POST | /api/auth/refresh-token | Perbarui access token |
| GET | /api/auth/me | Profil user aktif + daftar permission |
| GET/POST | /api/users | List & create user |
| GET/PUT/DELETE | /api/users/:id | Detail, update, hapus user |
| GET/POST | /api/roles | List & create role |
| GET/PUT/DELETE | /api/roles/:id | Detail, update, hapus role |
| GET/PUT | /api/roles/:roleId/permissions | Lihat & atur hak akses menu untuk role |
| GET/POST | /api/menus | List & create menu |
| GET | /api/menus/tree | Menu dalam bentuk tree (sidebar) |
| GET/PUT/DELETE | /api/menus/:id | Detail, update, hapus menu |
| GET/POST | /api/golongan-kelas | List & create golongan kelas |
| GET/PUT/DELETE | /api/golongan-kelas/:id | Detail, update, soft-delete golongan kelas |
| GET/POST | /api/jurusan | List (bisa filter `?golonganKelasId=`) & create jurusan |
| GET/PUT/DELETE | /api/jurusan/:id | Detail, update, soft-delete jurusan |
| GET/POST | /api/sumber-informasi | List & create sumber informasi |
| GET/PUT/DELETE | /api/sumber-informasi/:id | Detail, update, hapus sumber informasi |
| GET/POST | /api/ukuran-almamater | List & create ukuran almamater |
| GET/PUT/DELETE | /api/ukuran-almamater/:id | Detail, update, hapus ukuran almamater |
| GET/POST | /api/pembayaran | List (filter `?isBeasiswa=`) & create pembayaran |
| GET/PUT/DELETE | /api/pembayaran/:id | Detail, update, hapus pembayaran |
| GET/POST | /api/dokumen-pendaftaran | List (filter `?isWajib=`) & create dokumen pendaftaran |
| GET/PUT/DELETE | /api/dokumen-pendaftaran/:id | Detail, update, hapus dokumen pendaftaran |
| GET/POST | /api/dokumen-kelengkapan | List (tanpa field `file`) & create dokumen kelengkapan |
| GET/PUT/DELETE | /api/dokumen-kelengkapan/:id | Detail (dengan `file`), update, hapus dokumen kelengkapan |
| GET/POST | /api/gelombang | List & create gelombang |
| GET/PUT/DELETE | /api/gelombang/:id | Detail, update, hapus gelombang |

## Modul Prodi — Dashboard & Biodata Mahasiswa

- **Dashboard Prodi** (`GET /prodi/beranda` di frontend) murni komposisi ulang endpoint yang sudah ada — tidak ada endpoint baru di backend. Kartu ringkasan & grafik memanggil: `GET /api/mahasiswa?isActive=true`/`?statusKeluar=CUTI` (total mahasiswa aktif/cuti), `GET /api/dosen` & `GET /api/dosen/stats` (total dosen & distribusi kelompok fakultas), `GET /api/yudisium` (total & daftar lulusan terbaru), `GET /api/nilai-mahasiswa/semester-summary` (rata-rata nilai per semester), `GET /api/prodi/jadwal-sidang` (jadwal sidang terbaru).
- `prodi/biodata_mahasiswa` (list): endpoint baru `GET /api/prodi/biodata-mahasiswa` — daftar biodata mahasiswa (NIM, nama, HP, kelas, jenis kelamin, prodi, status masuk) untuk modul Prodi, filter `?nim=`. Read-only list; edit biodata memakai endpoint yang sudah ada `GET/PUT /api/mahasiswa/:id/biodata` (kini juga diotorisasi untuk menu `PRODI_BIODATA_MAHASISWA_MANAGEMENT`, selain `MAHASISWA_MANAGEMENT`/`YUDISIUM_MANAGEMENT`).

## Migration & Seeder

Migration ditulis versioned (mirip konsep Flyway) menggunakan `sequelize-cli`, tersimpan di `src/migrations` dengan penamaan `TIMESTAMP-nama.js`. Gunakan:

```
npx sequelize-cli migration:generate --name nama-migration
npx sequelize-cli seed:generate --name nama-seeder
```

untuk menambah migration/seeder baru.
