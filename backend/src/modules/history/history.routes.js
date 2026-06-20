const express = require('express');
const router = express.Router();
const controller = require('./history.controller');

router.get('/', controller.getHistory);

module.exports = router;
