const mongoose = require('mongoose');

const LikedSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  title: { type: String, default: 'Unknown Song' },
  artist: { type: String, default: 'Unknown Artist' },
  duration: { type: Number, default: 0 },
  thumbnail: { type: String, default: '' },
  likedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Liked', LikedSchema);
