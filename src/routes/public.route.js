const router = require('express').Router();
const publicController = require('../controllers/public.controller');

/**
 * @swagger
 * tags:
 *   name: Public
 *   description: Endpoint publik tanpa autentikasi (dipakai form pendaftaran peserta di website PMB)
 */

/**
 * @swagger
 * /public/golongan-kelas:
 *   get:
 *     summary: List golongan kelas (publik, untuk dropdown form pendaftaran)
 *     tags: [Public]
 *     responses:
 *       200:
 *         description: List of golongan kelas
 */
router.get('/golongan-kelas', publicController.listGolonganKelas);

/**
 * @swagger
 * /public/jurusan:
 *   get:
 *     summary: List jurusan (publik, bisa difilter per golongan kelas, untuk dropdown form pendaftaran)
 *     tags: [Public]
 *     parameters:
 *       - $ref: '#/components/parameters/GolonganKelasIdQueryParam'
 *     responses:
 *       200:
 *         description: List of jurusan
 */
router.get('/jurusan', publicController.listJurusan);

/**
 * @swagger
 * /public/gelombang/active:
 *   get:
 *     summary: Get the currently active (or nearest upcoming) gelombang (publik, untuk ditampilkan di landing page)
 *     tags: [Public]
 *     responses:
 *       200:
 *         description: Active gelombang (or null if none exists)
 */
router.get('/gelombang/active', publicController.activeGelombang);

/**
 * @swagger
 * /public/menus:
 *   get:
 *     summary: List active public menus (publik, untuk navigasi landing page)
 *     tags: [Public]
 *     responses:
 *       200:
 *         description: List of public menus
 */
router.get('/menus', publicController.listMenus);

/**
 * @swagger
 * /public/kampus:
 *   get:
 *     summary: Get profil kampus (publik, untuk header/footer & kontak website)
 *     tags: [Public]
 *     responses:
 *       200:
 *         description: Profil kampus
 */
router.get('/kampus', publicController.kampus);

/**
 * @swagger
 * /public/beasiswa:
 *   get:
 *     summary: List active beasiswa pages (publik, untuk dropdown menu & footer)
 *     tags: [Public]
 *     responses:
 *       200:
 *         description: List of beasiswa
 */
router.get('/beasiswa', publicController.listBeasiswa);

/**
 * @swagger
 * /public/beasiswa/{slug}:
 *   get:
 *     summary: Get beasiswa detail by slug (publik)
 *     tags: [Public]
 *     parameters:
 *       - name: slug
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Beasiswa detail
 *       404:
 *         description: Beasiswa not found
 */
router.get('/beasiswa/:slug', publicController.beasiswaDetail);

/**
 * @swagger
 * /public/biaya-kuliah:
 *   get:
 *     summary: List active biaya kuliah pages (publik, untuk dropdown menu & footer)
 *     tags: [Public]
 *     responses:
 *       200:
 *         description: List of biaya kuliah
 */
router.get('/biaya-kuliah', publicController.listBiayaKuliah);

/**
 * @swagger
 * /public/biaya-kuliah/{slug}:
 *   get:
 *     summary: Get biaya kuliah detail by slug (publik)
 *     tags: [Public]
 *     parameters:
 *       - name: slug
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Biaya kuliah detail
 *       404:
 *         description: Biaya kuliah not found
 */
router.get('/biaya-kuliah/:slug', publicController.biayaKuliahDetail);

/**
 * @swagger
 * /public/calon-mahasiswa:
 *   get:
 *     summary: List data calon mahasiswa (publik, read-only, untuk halaman Informasi > Data Calon Mahasiswa)
 *     tags: [Public]
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - $ref: '#/components/parameters/SearchParam'
 *     responses:
 *       200:
 *         description: List of calon mahasiswa
 */
router.get('/calon-mahasiswa', publicController.listCalonMahasiswa);

/**
 * @swagger
 * /public/calon-mahasiswa/stats:
 *   get:
 *     summary: Get ringkasan statistik calon mahasiswa (publik)
 *     tags: [Public]
 *     responses:
 *       200:
 *         description: Statistik calon mahasiswa
 */
router.get('/calon-mahasiswa/stats', publicController.calonMahasiswaStats);

/**
 * @swagger
 * /public/home-images:
 *   get:
 *     summary: Get konfigurasi gambar beranda (publik, dipakai halaman Beranda website)
 *     tags: [Public]
 *     responses:
 *       200:
 *         description: Konfigurasi gambar beranda
 */
router.get('/home-images', publicController.homeImages);

module.exports = router;
