const path = require('path');
require('dotenv').config();

const ROOT_DIR = path.join(__dirname, '..', '..');

module.exports = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE: {
    PLAYLISTS_FILE: path.join(__dirname, '..', 'database', 'playlists.json'),
    LIKED_FILE: path.join(__dirname, '..', 'database', 'liked.json'),
    HISTORY_FILE: path.join(__dirname, '..', 'database', 'history.json')
  },
  CACHE_DIR: path.join(ROOT_DIR, 'cache'),
  COOKIES_BROWSER: process.env.YT_DLP_COOKIES_BROWSER,
  YT_DLP_COOKIES_TEXT: process.env.YT_DLP_COOKIES_TEXT
};
