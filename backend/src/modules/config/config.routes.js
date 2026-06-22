const express = require('express');
const router = express.Router();
const controller = require('./config.controller');

router.get('/cache-path', controller.getCachePath);
router.post('/cache-path', controller.updateCachePath);

module.exports = router;
