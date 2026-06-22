const mongoose = require('mongoose');

const SongSubSchema = new mongoose.Schema({
  id: { type: String, required: true },
  title: { type: String, default: 'Unknown Song' },
  artist: { type: String, default: 'Unknown Artist' },
  duration: { type: Number, default: 0 },
  thumbnail: { type: String, default: '' }
}, { _id: false });

const PlaylistSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  songs: [SongSubSchema]
});

module.exports = mongoose.model('Playlist', PlaylistSchema);
