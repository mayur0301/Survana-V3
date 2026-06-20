const { searchSongs, streamAudio, downloadAudio } = require('../../utils/yt-dlp-helper');
const { readDb, writeDb, FILES } = require('../../database');

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
    
    let history = readDb(FILES.HISTORY_FILE);
    // Remove if already exists to push it to the top
    history = history.filter(song => song.id !== id);
    history.unshift({
      id,
      title: songTitle,
      artist: songArtist,
      duration: songDuration,
      thumbnail: songThumbnail,
      playedAt: new Date().toISOString()
    });
    // Limit to 50 items
    writeDb(FILES.HISTORY_FILE, history.slice(0, 50));
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
