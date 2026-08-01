const express = require('express');
const router = express.Router();
const controller = require('./debug.controller');

router.get('/environment', controller.getEnvironment);
router.get('/yt-dlp-diagnostic', controller.getYtDlpDiagnostic);

module.exports = router;
