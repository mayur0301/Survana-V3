const express = require('express');
const router = express.Router();
const controller = require('./lyrics.controller');

router.get('/', controller.getLyrics);

module.exports = router;
