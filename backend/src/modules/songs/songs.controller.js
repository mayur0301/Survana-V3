const { searchSongs, streamAudio, downloadAudio } = require('../../utils/yt-dlp-helper');
const History = require('../../database/models/History');

const search = async (req, res, next) => {
  const query = req.query.q;
  if (!query) {
    return res.status(400).json({ error: 'Search query is required' });
  }

  try {
    const results = await searchSongs(query);
    res.json(results);
  } catch (error) {
    next(error);
  }
};

const stream = async (req, res, next) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ error: 'Video ID is required' });
  }

  // Record in play history
  try {
    const songTitle = req.query.title || 'Unknown Song';
    const songArtist = req.query.artist || 'Unknown Artist';
    const songDuration = parseInt(req.query.duration) || 0;
    const songThumbnail = req.query.thumbnail || '';
    
    // Remove if already exists to push it to the top
    await History.deleteOne({ id });
    await History.create({
      id,
      title: songTitle,
      artist: songArtist,
      duration: songDuration,
      thumbnail: songThumbnail,
      playedAt: new Date()
    });
    
    // Limit to 50 items
    const count = await History.countDocuments();
    if (count > 50) {
      const oldestToKeep = await History.find().sort({ playedAt: -1 }).skip(49).limit(1);
      if (oldestToKeep.length > 0) {
        await History.deleteMany({ playedAt: { $lt: oldestToKeep[0].playedAt } });
      }
    }
  } catch (err) {
    console.error('Failed to update history:', err.message);
  }

  // Call the helper to pipe the stream
  streamAudio(id, req, res);
};

const download = (req, res) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ error: 'Video ID is required' });
  }
  downloadAudio(id, res);
};

module.exports = {
  search,
  stream,
  download
};
