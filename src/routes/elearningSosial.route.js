const express = require('express');
const Joi = require('joi');
const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const validate = require('../middlewares/validate.middleware');
const authenticateDosen = require('../middlewares/dosenAuth.middleware');
const authenticateMahasiswa = require('../middlewares/mahasiswaAuth.middleware');
const jelajah = require('../services/elearningJelajah.service');
const obrolan = require('../services/obrolan.service');
const notifikasi = require('../services/notifikasi.service');

/**
 * E-learning sosial: Jelajah & Obrolan (dosen & mahasiswa).
 * Dipasang di /dosen-portal/jelajah, /mahasiswa-portal/jelajah, /mahasiswa-portal/obrolan, /dosen-portal/obrolan.
 */

// ---- Jelajah ----
const daftarJelajah = (viewerOf) =>
  catchAsync(async (req, res) => sendResponse(res, 200, { message: 'Jelajah fetched', data: await jelajah.listJelajah(viewerOf(req), req.query) }));
const detailJelajah = (viewerOf) =>
  catchAsync(async (req, res) => sendResponse(res, 200, { message: 'Konten fetched', data: await jelajah.detailJelajah(viewerOf(req), req.params.id) }));
const berkasJelajah = (viewerOf) =>
  catchAsync(async (req, res) =>
    sendResponse(res, 200, { message: 'Berkas fetched', data: await jelajah.berkasJelajah(viewerOf(req), req.params.id, req.params.berkasId) })
  );

const jelajahDosen = express.Router();
jelajahDosen.use(authenticateDosen);
jelajahDosen.get('/', daftarJelajah((req) => ({ dosenId: req.dosen.id })));
jelajahDosen.get('/:id', detailJelajah((req) => ({ dosenId: req.dosen.id })));
jelajahDosen.get('/:id/berkas/:berkasId', berkasJelajah((req) => ({ dosenId: req.dosen.id })));

const jelajahMahasiswa = express.Router();
jelajahMahasiswa.use(authenticateMahasiswa);
jelajahMahasiswa.get('/', daftarJelajah((req) => ({ mahasiswaId: req.mahasiswa.id })));
jelajahMahasiswa.get('/:id', detailJelajah((req) => ({ mahasiswaId: req.mahasiswa.id })));
jelajahMahasiswa.get('/:id/berkas/:berkasId', berkasJelajah((req) => ({ mahasiswaId: req.mahasiswa.id })));

// ---- Obrolan (mahasiswa & dosen) ----
const lawanSchema = Joi.object({ tipe: Joi.string().valid('M', 'D').required(), id: Joi.number().integer().required() });
const pesanSchema = Joi.object({
  isi: Joi.string().trim().max(2000).allow('', null),
  lampiran: Joi.string().allow('', null),
  lampiranNama: Joi.string().trim().max(255).allow('', null),
}).or('isi', 'lampiran');

/** Router obrolan untuk satu portal; pihakOf(req) = { tipe: 'M' | 'D', id, tahunAjaranId? }. */
const routerObrolan = (auth, pihakOf) => {
  const r = express.Router();
  r.use(auth);
  r.get('/', catchAsync(async (req, res) => sendResponse(res, 200, { message: 'Obrolan fetched', data: await obrolan.listObrolan(pihakOf(req)) })));
  r.get('/belum-dibaca', catchAsync(async (req, res) => sendResponse(res, 200, { message: 'OK', data: await obrolan.totalBelumDibaca(pihakOf(req)) })));
  r.get('/kontak', catchAsync(async (req, res) => sendResponse(res, 200, { message: 'Kontak fetched', data: await obrolan.kontak(pihakOf(req)) })));
  r.post(
    '/pribadi',
    validate(lawanSchema),
    catchAsync(async (req, res) => sendResponse(res, 200, { message: 'Obrolan dibuka', data: await obrolan.mulaiPribadi(pihakOf(req), req.body) }))
  );
  r.get(
    '/:id/pesan',
    catchAsync(async (req, res) =>
      sendResponse(res, 200, {
        message: 'Pesan fetched',
        data: await obrolan.listPesan(pihakOf(req), req.params.id, Number(req.query.setelah) || 0, Number(req.query.sebelum) || 0, Number(req.query.dari) || 0),
      })
    )
  );
  r.get(
    '/:id/pesan/:pesanId/lampiran',
    catchAsync(async (req, res) => sendResponse(res, 200, { message: 'Lampiran fetched', data: await obrolan.lampiranPesan(pihakOf(req), req.params.id, req.params.pesanId) }))
  );
  r.post(
    '/:id/pesan',
    validate(pesanSchema),
    catchAsync(async (req, res) => sendResponse(res, 201, { message: 'Pesan terkirim', data: await obrolan.kirimPesan(pihakOf(req), req.params.id, req.body) }))
  );
  // Tarik pesan milik sendiri (tombol × di gelembung pesan).
  r.delete(
    '/:id/pesan/:pesanId',
    catchAsync(async (req, res) => sendResponse(res, 200, { message: 'Pesan ditarik', data: await obrolan.tarikPesan(pihakOf(req), req.params.id, req.params.pesanId) }))
  );
  return r;
};
const obrolanMahasiswa = routerObrolan(authenticateMahasiswa, (req) => ({ tipe: 'M', id: req.mahasiswa.id }));
const obrolanDosen = routerObrolan(authenticateDosen, (req) => ({ tipe: 'D', id: req.dosen.id, tahunAjaranId: req.tahunAjaranId }));

/** Lonceng notifikasi portal: GET = daftar + jumlah belum dibaca, POST /baca = lonceng dibuka (tandai dibaca). */
const routerNotifikasi = (auth, pihakOf) => {
  const r = express.Router();
  r.use(auth);
  r.get('/', catchAsync(async (req, res) => sendResponse(res, 200, { message: 'Notifikasi fetched', data: await notifikasi.daftar(pihakOf(req)) })));
  r.post('/baca', catchAsync(async (req, res) => sendResponse(res, 200, { message: 'Notifikasi dibaca', data: await notifikasi.tandaiDibaca(pihakOf(req)) })));
  return r;
};
const notifikasiMahasiswa = routerNotifikasi(authenticateMahasiswa, (req) => ({ tipe: 'M', id: req.mahasiswa.id }));
const notifikasiDosen = routerNotifikasi(authenticateDosen, (req) => ({ tipe: 'D', id: req.dosen.id, tahunAjaranId: req.tahunAjaranId }));

module.exports = { jelajahDosen, jelajahMahasiswa, obrolanMahasiswa, obrolanDosen, notifikasiMahasiswa, notifikasiDosen };
