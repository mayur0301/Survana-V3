const Liked = require('../../database/models/Liked');

const getLiked = async (req, res, next) => {
  try {
    const liked = await Liked.find().sort({ likedAt: -1 });
    res.json(liked);
  } catch (error) {
    next(error);
  }
};

const toggleLiked = async (req, res, next) => {
  const song = req.body;
  if (!song || !song.id) {
    return res.status(400).json({ error: 'Invalid song details' });
  }

  try {
    const existing = await Liked.findOne({ id: song.id });
    let isLiked = false;

    if (existing) {
      await Liked.deleteOne({ id: song.id });
    } else {
      await Liked.create({
        id: song.id,
        title: song.title,
        artist: song.artist,
        duration: song.duration,
        thumbnail: song.thumbnail,
        likedAt: new Date()
      });
      isLiked = true;
    }

    const liked = await Liked.find().sort({ likedAt: -1 });
    res.json({ isLiked, liked });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getLiked,
  toggleLiked
};
