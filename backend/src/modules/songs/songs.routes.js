const express = require('express');
const router = express.Router();
const controller = require('./songs.controller');

router.get('/search', controller.search);
router.get('/stream/:id', controller.stream);
router.get('/download/:id', controller.download);

module.exports = router;
