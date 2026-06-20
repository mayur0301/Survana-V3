const { readDb, writeDb, FILES } = require('../../database');

const getPlaylists = (req, res, next) => {
  try {
    const playlists = readDb(FILES.PLAYLISTS_FILE);
    res.json(playlists);
  } catch (error) {
    next(error);
  }
};

const createPlaylist = (req, res, next) => {
  const { name } = req.body;
  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Playlist name is required' });
  }

  try {
    const playlists = readDb(FILES.PLAYLISTS_FILE);
    const newPlaylist = {
      id: `pl-${Date.now()}`,
      name: name.trim(),
      songs: []
    };
    playlists.push(newPlaylist);
    writeDb(FILES.PLAYLISTS_FILE, playlists);
    res.json(newPlaylist);
  } catch (error) {
    next(error);
  }
};

const deletePlaylist = (req, res, next) => {
  const { id } = req.params;
  try {
    let playlists = readDb(FILES.PLAYLISTS_FILE);
    playlists = playlists.filter(pl => pl.id !== id);
    writeDb(FILES.PLAYLISTS_FILE, playlists);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

const addSong = (req, res, next) => {
  const { id } = req.params;
  const song = req.body;
  if (!song || !song.id) {
    return res.status(400).json({ error: 'Song is required' });
  }

  try {
    const playlists = readDb(FILES.PLAYLISTS_FILE);
    const playlist = playlists.find(pl => pl.id === id);
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    // Add if not already present
    if (!playlist.songs.some(s => s.id === song.id)) {
      playlist.songs.push(song);
      writeDb(FILES.PLAYLISTS_FILE, playlists);
    }
    res.json(playlist);
  } catch (error) {
    next(error);
  }
};

const removeSong = (req, res, next) => {
  const { id, songId } = req.params;
  try {
    const playlists = readDb(FILES.PLAYLISTS_FILE);
    const playlist = playlists.find(pl => pl.id === id);
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    playlist.songs = playlist.songs.filter(s => s.id !== songId);
    writeDb(FILES.PLAYLISTS_FILE, playlists);
    res.json(playlist);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPlaylists,
  createPlaylist,
  deletePlaylist,
  addSong,
  removeSong
};
