const express = require('express');
const router = express.Router();
const controller = require('./liked.controller');

router.get('/', controller.getLiked);
router.post('/', controller.toggleLiked);

module.exports = router;
