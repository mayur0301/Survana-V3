const getLyrics = async (req, res, next) => {
  const { title, artist } = req.query;
  if (!title) {
    return res.status(400).json({ error: 'Song title is required' });
  }

  try {
    // Attempt 1: Get lyrics by direct match
    const searchUrl = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(artist || '')}&track_name=${encodeURIComponent(title)}`;
    let response = await fetch(searchUrl);
    
    if (response.ok) {
      const data = await response.json();
      return res.json({
        plain: data.plainLyrics || null,
        synced: data.syncedLyrics || null
      });
    }

    // Attempt 2: Search for track if exact match failed
    const listUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(`${title} ${artist || ''}`)}`;
    response = await fetch(listUrl);
    if (response.ok) {
      const results = await response.json();
      if (results && results.length > 0) {
        // Return first search result with lyrics
        const bestMatch = results[0];
        return res.json({
          plain: bestMatch.plainLyrics || null,
          synced: bestMatch.syncedLyrics || null
        });
      }
    }

    res.status(404).json({ error: 'Lyrics not found' });
  } catch (error) {
    console.error('Lyrics search error:', error.message);
    next(error);
  }
};

module.exports = {
  getLyrics
};
