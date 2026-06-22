const Settings = require('./models/Settings');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Default location on computer: home directory / SurvanaCache
const DEFAULT_CACHE_DIR = path.join(os.homedir(), 'SurvanaCache');

async function getCacheDir() {
  try {
    const setting = await Settings.findOne({ key: 'cachePath' });
    const dir = setting ? setting.value : DEFAULT_CACHE_DIR;
    
    // Ensure directory exists
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  } catch (error) {
    console.error('Error getting cache directory:', error.message);
    return DEFAULT_CACHE_DIR;
  }
}

async function setCacheDir(newPath) {
  if (!path.isAbsolute(newPath)) {
    throw new Error('Path must be an absolute directory path');
  }

  // Normalize path format for target system
  const normalizedPath = path.normalize(newPath);

  // Ensure it exists or can be created
  if (!fs.existsSync(normalizedPath)) {
    fs.mkdirSync(normalizedPath, { recursive: true });
  }

  await Settings.findOneAndUpdate(
    { key: 'cachePath' },
    { value: normalizedPath },
    { upsert: true, new: true }
  );
}

module.exports = {
  getCacheDir,
  setCacheDir,
  DEFAULT_CACHE_DIR
};
