const { getCacheDir, setCacheDir } = require('../../database/settings');
const Settings = require('../../database/models/Settings');

const getCachePath = async (req, res, next) => {
  try {
    const path = await getCacheDir();
    const setting = await Settings.findOne({ key: 'cachePath' });
    res.json({
      cachePath: path,
      isConfigured: !!setting
    });
  } catch (error) {
    next(error);
  }
};

const updateCachePath = async (req, res, next) => {
  const { cachePath } = req.body;
  if (!cachePath || cachePath.trim() === '') {
    return res.status(400).json({ error: 'Cache path is required' });
  }

  try {
    await setCacheDir(cachePath.trim());
    res.json({ success: true, cachePath: cachePath.trim() });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = {
  getCachePath,
  updateCachePath
};
