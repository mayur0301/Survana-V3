const Playlist = require('../../database/models/Playlist');

const getPlaylists = async (req, res, next) => {
  try {
    const playlists = await Playlist.find();
    res.json(playlists.map(pl => ({
      id: pl._id.toString(),
      name: pl.name,
      songs: pl.songs
    })));
  } catch (error) {
    next(error);
  }
};

const createPlaylist = async (req, res, next) => {
  const { name } = req.body;
  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Playlist name is required' });
  }

  try {
    const newPlaylist = await Playlist.create({
      name: name.trim(),
      songs: []
    });
    res.json({
      id: newPlaylist._id.toString(),
      name: newPlaylist.name,
      songs: newPlaylist.songs
    });
  } catch (error) {
    next(error);
  }
};

const deletePlaylist = async (req, res, next) => {
  const { id } = req.params;
  try {
    await Playlist.findByIdAndDelete(id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

const addSong = async (req, res, next) => {
  const { id } = req.params;
  const song = req.body;
  if (!song || !song.id) {
    return res.status(400).json({ error: 'Song is required' });
  }

  try {
    const playlist = await Playlist.findById(id);
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    // Add if not already present
    if (!playlist.songs.some(s => s.id === song.id)) {
      playlist.songs.push(song);
      await playlist.save();
    }
    
    res.json({
      id: playlist._id.toString(),
      name: playlist.name,
      songs: playlist.songs
    });
  } catch (error) {
    next(error);
  }
};

const removeSong = async (req, res, next) => {
  const { id, songId } = req.params;
  try {
    const playlist = await Playlist.findById(id);
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    playlist.songs = playlist.songs.filter(s => s.id !== songId);
    await playlist.save();

    res.json({
      id: playlist._id.toString(),
      name: playlist.name,
      songs: playlist.songs
    });
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
