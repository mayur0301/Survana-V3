const { readDb, writeDb, FILES } = require('../../database');

const getLiked = (req, res, next) => {
  try {
    const liked = readDb(FILES.LIKED_FILE);
    res.json(liked);
  } catch (error) {
    next(error);
  }
};

const toggleLiked = (req, res, next) => {
  const song = req.body;
  if (!song || !song.id) {
    return res.status(400).json({ error: 'Invalid song details' });
  }

  try {
    const liked = readDb(FILES.LIKED_FILE);
    const index = liked.findIndex(item => item.id === song.id);
    let isLiked = false;

    if (index >= 0) {
      liked.splice(index, 1);
    } else {
      liked.unshift(song);
      isLiked = true;
    }

    writeDb(FILES.LIKED_FILE, liked);
    res.json({ isLiked, liked });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getLiked,
  toggleLiked
};
