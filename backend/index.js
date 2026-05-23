const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');
const { searchSongs, streamAudio, downloadAudio } = require('./yt-dlp-helper');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" } // Required to allow browser streaming without CORS blockage
}));
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'DELETE', 'PUT'],
  allowedHeaders: ['Content-Type', 'Range']
}));
app.use(morgan('dev'));
app.use(express.json());

// Persistent database paths
const PLAYLISTS_FILE = path.join(__dirname, 'playlists.json');
const LIKED_FILE = path.join(__dirname, 'liked.json');
const HISTORY_FILE = path.join(__dirname, 'history.json');

// Initialize database files if they don't exist
const initDbFile = (filePath, defaultVal = []) => {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultVal, null, 2));
  }
};
initDbFile(PLAYLISTS_FILE, []);
initDbFile(LIKED_FILE, []);
initDbFile(HISTORY_FILE, []);

// Database reading/writing helpers
const readDb = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));
const writeDb = (filePath, data) => fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

// --- API Endpoints ---

// 1. Search YouTube
app.get('/api/search', async (req, res) => {
  const query = req.query.q;
  if (!query) {
    return res.status(400).json({ error: 'Search query is required' });
  }

  try {
    const results = await searchSongs(query);
    res.json(results);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Failed to search songs' });
  }
});

// 2. Stream Audio
app.get('/api/stream/:id', (req, res) => {
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
    
    let history = readDb(HISTORY_FILE);
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
    writeDb(HISTORY_FILE, history.slice(0, 50));
  } catch (err) {
    console.error('Failed to update history:', err.message);
  }

  // Call the helper to pipe the stream
  streamAudio(id, req, res);
});

// 3. Download Audio
app.get('/api/download/:id', (req, res) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ error: 'Video ID is required' });
  }
  downloadAudio(id, res);
});

// 4. Play History
app.get('/api/history', (req, res) => {
  try {
    const history = readDb(HISTORY_FILE);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// 5. Liked Songs
app.get('/api/liked', (req, res) => {
  try {
    const liked = readDb(LIKED_FILE);
    res.json(liked);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch liked songs' });
  }
});

app.post('/api/liked', (req, res) => {
  const song = req.body;
  if (!song || !song.id) {
    return res.status(400).json({ error: 'Invalid song details' });
  }

  try {
    const liked = readDb(LIKED_FILE);
    const index = liked.findIndex(item => item.id === song.id);
    let isLiked = false;

    if (index >= 0) {
      liked.splice(index, 1);
    } else {
      liked.unshift(song);
      isLiked = true;
    }

    writeDb(LIKED_FILE, liked);
    res.json({ isLiked, liked });
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle liked song' });
  }
});

// 6. Playlists Operations
app.get('/api/playlists', (req, res) => {
  try {
    const playlists = readDb(PLAYLISTS_FILE);
    res.json(playlists);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch playlists' });
  }
});

app.post('/api/playlists', (req, res) => {
  const { name } = req.body;
  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Playlist name is required' });
  }

  try {
    const playlists = readDb(PLAYLISTS_FILE);
    const newPlaylist = {
      id: `pl-${Date.now()}`,
      name: name.trim(),
      songs: []
    };
    playlists.push(newPlaylist);
    writeDb(PLAYLISTS_FILE, playlists);
    res.json(newPlaylist);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create playlist' });
  }
});

app.delete('/api/playlists/:id', (req, res) => {
  const { id } = req.params;
  try {
    let playlists = readDb(PLAYLISTS_FILE);
    playlists = playlists.filter(pl => pl.id !== id);
    writeDb(PLAYLISTS_FILE, playlists);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete playlist' });
  }
});

app.post('/api/playlists/:id/songs', (req, res) => {
  const { id } = req.params;
  const song = req.body;
  if (!song || !song.id) {
    return res.status(400).json({ error: 'Song is required' });
  }

  try {
    const playlists = readDb(PLAYLISTS_FILE);
    const playlist = playlists.find(pl => pl.id === id);
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    // Add if not already present
    if (!playlist.songs.some(s => s.id === song.id)) {
      playlist.songs.push(song);
      writeDb(PLAYLISTS_FILE, playlists);
    }
    res.json(playlist);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add song to playlist' });
  }
});

app.delete('/api/playlists/:id/songs/:songId', (req, res) => {
  const { id, songId } = req.params;
  try {
    const playlists = readDb(PLAYLISTS_FILE);
    const playlist = playlists.find(pl => pl.id === id);
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    playlist.songs = playlist.songs.filter(s => s.id !== songId);
    writeDb(PLAYLISTS_FILE, playlists);
    res.json(playlist);
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove song from playlist' });
  }
});

// 7. Lyrics via LRCLIB
app.get('/api/lyrics', async (req, res) => {
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
    res.status(500).json({ error: 'Failed to search lyrics' });
  }
});

// Serve static frontend files in production
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../frontend/dist');
  app.use(express.static(distPath));
  
  // Wildcard fallback to serve index.html for React SPA
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Survana V3 server is running on port ${PORT}`);
});
