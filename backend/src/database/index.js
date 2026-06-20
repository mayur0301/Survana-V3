const fs = require('fs');
const config = require('../config');

// Initialize database files if they don't exist
const initDbFile = (filePath, defaultVal = []) => {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultVal, null, 2));
  }
};

initDbFile(config.DATABASE.PLAYLISTS_FILE, []);
initDbFile(config.DATABASE.LIKED_FILE, []);
initDbFile(config.DATABASE.HISTORY_FILE, []);

const readDb = (filePath) => {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.error(`Error reading database file at ${filePath}:`, error.message);
    return [];
  }
};

const writeDb = (filePath, data) => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error(`Error writing database file at ${filePath}:`, error.message);
    return false;
  }
};

module.exports = {
  readDb,
  writeDb,
  FILES: config.DATABASE
};
