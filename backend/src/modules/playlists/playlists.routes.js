const express = require('express');
const router = express.Router();
const controller = require('./playlists.controller');

router.get('/', controller.getPlaylists);
router.post('/', controller.createPlaylist);
router.delete('/:id', controller.deletePlaylist);
router.post('/:id/songs', controller.addSong);
router.delete('/:id/songs/:songId', controller.removeSong);

module.exports = router;
