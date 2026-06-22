const path = require('path');
require('dotenv').config();

const ROOT_DIR = path.join(__dirname, '..', '..');

module.exports = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/survana-v3',
  CACHE_DIR: path.join(ROOT_DIR, 'cache'),
  COOKIES_BROWSER: process.env.YT_DLP_COOKIES_BROWSER,
  YT_DLP_COOKIES_TEXT: process.env.YT_DLP_COOKIES_TEXT
};
