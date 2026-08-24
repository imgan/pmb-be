const express = require('express');
const controller = require('../controllers/syncFingerLog.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const validate = require('../middlewares/validate.middleware');
const { pullFromMachine } = require('../validations/syncFingerLog.validation');
const ACTION = require('../constants/actions');

/**
 * @swagger
 * tags:
 *   name: SyncFinger
 *   description: Sinkronisasi log absensi fingerprint (per mesin A1/A2) di modul SDI
 */

/**
 * Sync Finger A1 dan A2 dipisah jadi dua menu (dan dua permission) yang identik secara
 * fungsi, jadi router-nya dibuat sebagai factory supaya logic-nya tidak diduplikasi.
 */
const createSyncFingerRoute = (mesin, menuCode) => {
  const router = express.Router();

  router.use(authenticate);
  router.use((req, res, next) => {
    req.mesin = mesin;
    next();
  });

  router.get('/', authorize(menuCode, ACTION.READ), controller.list);
  router.get('/template', authorize(menuCode, ACTION.READ), controller.template);
  router.post('/pull', authorize(menuCode, ACTION.CREATE), validate(pullFromMachine), controller.pull);
  router.post('/insert', authorize(menuCode, ACTION.CREATE), controller.insert);

  return router;
};

module.exports = createSyncFingerRoute;
