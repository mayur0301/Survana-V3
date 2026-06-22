const mongoose = require('mongoose');

const HistorySchema = new mongoose.Schema({
  id: { type: String, required: true, index: true },
  title: { type: String, default: 'Unknown Song' },
  artist: { type: String, default: 'Unknown Artist' },
  duration: { type: Number, default: 0 },
  thumbnail: { type: String, default: '' },
  playedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('History', HistorySchema);
