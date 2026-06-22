const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');
const config = require('../config');
const { getCacheDir } = require('../database/settings');

// Track active background downloads to prevent duplicate processes
const activeDownloads = new Set();

const COOKIES_BROWSER = config.COOKIES_BROWSER;

/**
 * Builds the array of arguments for yt-dlp.
 * Always configures the JavaScript runtime and optionally configures cookies.
 */
function prepareYtDlpArgs(customArgs, useCookies = true) {
  let args = ['-m', 'yt_dlp', '--no-update', ...customArgs];

  // 1. Explicitly enable Deno and Node.js as the JavaScript runtimes for challenge/signature solving.
  // We prioritize Deno (installed in Docker) and fall back to the running Node binary.
  args.push('--js-runtimes', 'deno');
  args.push('--js-runtimes', `node:${process.execPath}`);

  // 2. Add cookies if requested
  if (useCookies) {
    // A. Check if cookies text is provided via Environment Variable (safest for Render)
    if (config.YT_DLP_COOKIES_TEXT) {
      const tempCookiesPath = path.join(__dirname, 'temp-cookies.txt');
      try {
        if (!fs.existsSync(tempCookiesPath) || fs.readFileSync(tempCookiesPath, 'utf8') !== config.YT_DLP_COOKIES_TEXT) {
          fs.writeFileSync(tempCookiesPath, config.YT_DLP_COOKIES_TEXT, 'utf8');
        }
        args.push('--cookies', tempCookiesPath);
        return args;
      } catch (e) {
        console.error('Failed to write temp-cookies.txt from YT_DLP_COOKIES_TEXT env variable:', e.message);
      }
    }

    // B. Check if a local cookies.txt file exists in backend/ or root directory
    const localCookiesPath = path.join(__dirname, '..', '..', 'cookies.txt');
    const rootCookiesPath = path.join(__dirname, '..', '..', '..', 'cookies.txt');

    if (fs.existsSync(localCookiesPath)) {
      args.push('--cookies', localCookiesPath);
    } else if (fs.existsSync(rootCookiesPath)) {
      args.push('--cookies', rootCookiesPath);
    } else {
      // C. Fallback to browser cookies only in non-production environments if explicitly specified
      if (config.NODE_ENV !== 'production' && COOKIES_BROWSER) {
        args.push('--cookies-from-browser', COOKIES_BROWSER);
      }
    }
  }

  return args;
}

/**
 * Run yt-dlp search and return formatted song entries
 */
function searchSongs(query) {
  return new Promise((resolve, reject) => {
    const limit = 15;
    const searchQuery = `ytsearch${limit}:${query}`;
    
    const args = prepareYtDlpArgs([
      searchQuery,
      '--flat-playlist',
      '--dump-json',
      '--skip-download'
    ], false);

    const child = spawn('python', args);

    let stdoutData = '';
    let stderrData = '';

    child.stdout.on('data', (data) => {
      stdoutData += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderrData += data.toString();
    });

    child.on('close', (code) => {
      if (code !== 0 && stdoutData.trim() === '') {
        console.error(`yt-dlp search failed with code ${code}: ${stderrData}`);
        return reject(new Error(`Search failed: ${stderrData}`));
      }

      const results = [];
      const lines = stdoutData.split('\n');
      
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const item = JSON.parse(line);
          if (item._type === 'playlist' || !item.id) continue;

          let thumbnail = `https://img.youtube.com/vi/${item.id}/hqdefault.jpg`;
          if (item.thumbnails && item.thumbnails.length > 0) {
            thumbnail = item.thumbnails[item.thumbnails.length - 1].url;
          }

          results.push({
            id: item.id,
            title: item.title || 'Unknown Title',
            artist: item.channel || item.uploader || 'Unknown Artist',
            duration: item.duration || 0,
            thumbnail: thumbnail,
            views: item.view_count || 0,
            isLive: item.live_status === 'is_live' || item.is_live === true
          });
        } catch (e) {
          console.error('Error parsing yt-dlp line json:', e.message);
        }
      }

      resolve(results);
    });
  });
}

/**
 * Calls yt-dlp to extract the direct media stream URL
 */
function getStreamUrl(videoId) {
  const runYtDlp = (useCookies) => {
    return new Promise((resolve, reject) => {
      const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const args = prepareYtDlpArgs(['-g', '-f', 'bestaudio/best', youtubeUrl], useCookies);
      
      const child = spawn('python', args);
      let stdoutData = '';
      let stderrData = '';

      child.stdout.on('data', (data) => {
        stdoutData += data.toString();
      });
      child.stderr.on('data', (data) => {
        stderrData += data.toString();
      });

      child.on('close', (code) => {
        if (code !== 0) {
          return reject(new Error(stderrData || `Exit code ${code}`));
        }
        resolve(stdoutData.trim());
      });
    });
  };

  // Try with cookies first, fallback to without cookies if it fails
  return runYtDlp(true).catch((err) => {
    console.warn(`[yt-dlp] Failed resolving stream with cookies, retrying without:`, err.message);
    return runYtDlp(false);
  });
}

// Sanitizes title to be safe for Windows and Linux/macOS filenames
function sanitizeFilename(name) {
  return name.replace(/[\\/:*?"<>|]/g, '_').trim();
}

// Scans for cached file for a videoId (new format with title or old format fallback)
async function findCachedFile(cacheDir, videoId) {
  try {
    if (!fs.existsSync(cacheDir)) return null;
    const files = await fs.promises.readdir(cacheDir);
    const found = files.find(f => (f === `${videoId}.webm` || f.startsWith(`${videoId} - `)) && f.endsWith('.webm'));
    return found ? path.join(cacheDir, found) : null;
  } catch (e) {
    return null;
  }
}

// MongoDB database lookup for song title
async function lookupSongTitleInDb(videoId) {
  try {
    const Liked = require('../database/models/Liked');
    const History = require('../database/models/History');
    const Playlist = require('../database/models/Playlist');

    const liked = await Liked.findOne({ id: videoId });
    if (liked && liked.title) return liked.title;

    const history = await History.findOne({ id: videoId });
    if (history && history.title) return history.title;

    const playlist = await Playlist.findOne({ "songs.id": videoId });
    if (playlist) {
      const song = playlist.songs.find(s => s.id === videoId);
      if (song && song.title) return song.title;
    }
  } catch (e) {
    console.error('[Cache Migration] DB lookup error:', e.message);
  }
  return null;
}

// Fetch title via yt-dlp metadata
function getVideoTitle(videoId) {
  return new Promise((resolve, reject) => {
    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const args = prepareYtDlpArgs(['--get-title', youtubeUrl], false);
    const child = spawn('python', args);
    let stdoutData = '';
    child.stdout.on('data', (data) => {
      stdoutData += data.toString();
    });
    child.on('close', (code) => {
      if (code === 0 && stdoutData.trim()) {
        resolve(stdoutData.trim());
      } else {
        reject(new Error(`Failed to get title for ${videoId}`));
      }
    });
  });
}

// Background migration function to rename old cache files
async function renameCachedFiles() {
  try {
    const cacheDir = await getCacheDir();
    if (!fs.existsSync(cacheDir)) return;

    const files = await fs.promises.readdir(cacheDir);
    const oldFiles = files.filter(f => f.endsWith('.webm') && !f.includes(' - '));

    if (oldFiles.length === 0) return;

    console.log(`[Cache Migration] Found ${oldFiles.length} legacy cached files to migrate.`);

    for (const file of oldFiles) {
      const videoId = path.basename(file, '.webm');
      if (videoId.length !== 11) continue; // Skip non-youtube ids

      try {
        let title = await lookupSongTitleInDb(videoId);
        if (!title) {
          console.log(`[Cache Migration] Song title for ${videoId} not in DB, querying YouTube...`);
          title = await getVideoTitle(videoId).catch(() => null);
        }

        const finalTitle = title || 'Unknown Title';
        const sanitizedTitle = sanitizeFilename(finalTitle);
        const oldPath = path.join(cacheDir, file);
        const newPath = path.join(cacheDir, `${videoId} - ${sanitizedTitle}.webm`);

        if (fs.existsSync(oldPath)) {
          await fs.promises.rename(oldPath, newPath);
          console.log(`[Cache Migration] Migrated cache file: ${file} -> ${videoId} - ${sanitizedTitle}.webm`);
        }
      } catch (err) {
        console.error(`[Cache Migration] Failed migrating ${file}:`, err.message);
      }
    }
  } catch (e) {
    console.error('[Cache Migration] Error during migration:', e.message);
  }
}

/**
 * Downloads a track fully to the cache directory in the background
 */
async function downloadToCache(videoId) {
  const cacheDir = await getCacheDir();
  const existingFile = await findCachedFile(cacheDir, videoId);
  
  if (existingFile || activeDownloads.has(videoId)) {
    return; // Already cached or currently downloading
  }

  activeDownloads.add(videoId);
  console.log(`[Background Cache] Starting download for ${videoId}...`);

  const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const outputPath = path.join(cacheDir, '%(id)s - %(title)s.webm');
  
  const runDownload = (useCookies) => {
    return new Promise((resolve, reject) => {
      const args = prepareYtDlpArgs(['-f', 'bestaudio', '-o', outputPath, youtubeUrl], useCookies);
      
      const ytdlp = spawn('python', args);
      let stderrData = '';
      
      ytdlp.stderr.on('data', (data) => {
        stderrData += data.toString();
      });
      
      ytdlp.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(stderrData || `Exit code ${code}`));
        }
      });
    });
  };

  runDownload(true)
    .catch((err) => {
      console.warn(`[Background Cache] Failed with cookies, retrying without cookies:`, err.message);
      return runDownload(false);
    })
    .then(() => {
      console.log(`[Background Cache] Finished caching ${videoId} successfully.`);
    })
    .catch(async (err) => {
      console.error(`[Background Cache] Failed caching ${videoId} completely:`, err.message);
      // Cleanup incomplete file if any
      const failedFile = await findCachedFile(cacheDir, videoId);
      if (failedFile && fs.existsSync(failedFile)) {
        fs.unlink(failedFile, () => {});
      }
    })
    .finally(() => {
      activeDownloads.delete(videoId);
    });
}

/**
 * Streams audio from YouTube or local cache.
 * Proxies the YouTube direct URL and forwards the browser's HTTP Range headers
 * to support smooth seeking/scrubbing for uncached files.
 */
async function streamAudio(videoId, req, res) {
  const cacheDir = await getCacheDir();
  const cachedPath = await findCachedFile(cacheDir, videoId);

  // 1. If cache exists, serve it directly.
  // Express res.sendFile automatically handles HTTP Range requests and seeking.
  if (cachedPath) {
    console.log(`[Cache Hit] Serving ${videoId} from local cache: ${path.basename(cachedPath)}`);
    res.setHeader('Content-Type', 'audio/webm');
    return res.sendFile(cachedPath);
  }

  // 2. If not cached, resolve stream URL and proxy it while forwarding range headers
  console.log(`[Cache Miss] Streaming ${videoId} via range proxy.`);
  
  try {
    const streamUrl = await getStreamUrl(videoId);
    
    // Set headers for range request forwarding
    const rangeHeader = req.headers.range || 'bytes=0-';
    
    const response = await fetch(streamUrl, {
      headers: {
        'Range': rangeHeader,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok && response.status !== 206) {
      console.error(`Proxy request to Google Video failed with status ${response.status}`);
      return res.status(response.status || 500).send('Error streaming from YouTube source');
    }

    // Set appropriate proxy headers
    res.status(response.status);
    
    // Forward response headers
    for (const [key, value] of response.headers.entries()) {
      const lowerKey = key.toLowerCase();
      if (['content-type', 'content-range', 'content-length', 'accept-ranges'].includes(lowerKey)) {
        res.setHeader(key, value);
      }
    }
    
    // Default Content-Type if missing
    if (!res.getHeader('Content-Type')) {
      res.setHeader('Content-Type', 'audio/webm');
    }

    // Convert Web ReadableStream to Node.js Readable stream and pipe to express response
    const nodeStream = Readable.fromWeb(response.body);
    nodeStream.pipe(res);

    // Cancel fetch stream on client disconnect to avoid waste of bandwidth
    req.on('close', () => {
      nodeStream.destroy();
    });

    // Start background download to cache this track for subsequent plays
    downloadToCache(videoId);

  } catch (error) {
    console.error(`[Streaming Proxy Error] for video ${videoId}:`, error.message);
    if (!res.headersSent) {
      res.status(500).send('Failed to fetch media stream from source');
    }
  }
}

/**
 * Downloads audio file and serves it as a browser attachment
 */
async function downloadAudio(videoId, res) {
  const cacheDir = await getCacheDir();
  const cachedPath = await findCachedFile(cacheDir, videoId);
  
  const triggerDownload = (filePath, fileName) => {
    res.download(filePath, fileName, (err) => {
      if (err) {
        console.error('Error during file download:', err);
        if (!res.headersSent) {
          res.status(500).send('Download failed');
        }
      }
    });
  };

  if (cachedPath) {
    return triggerDownload(cachedPath, path.basename(cachedPath));
  }

  console.log(`[Download] Downloading ${videoId} to serve...`);
  const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const outputPath = path.join(cacheDir, '%(id)s - %(title)s.webm');
  
  const runDownload = (useCookies) => {
    return new Promise((resolve, reject) => {
      const args = prepareYtDlpArgs(['-f', 'bestaudio', '-o', outputPath, youtubeUrl], useCookies);
      
      const ytdlp = spawn('python', args);
      let stderrData = '';
      
      ytdlp.stderr.on('data', (data) => {
        stderrData += data.toString();
      });
      
      ytdlp.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(stderrData || `Exit code ${code}`));
        }
      });
    });
  };

  runDownload(true)
    .catch((err) => {
      console.warn(`[Download] Failed with cookies, retrying without:`, err.message);
      return runDownload(false);
    })
    .then(async () => {
      const newCachedPath = await findCachedFile(cacheDir, videoId);
      if (newCachedPath) {
        console.log(`[Download Success] Saved to ${newCachedPath}`);
        triggerDownload(newCachedPath, path.basename(newCachedPath));
      } else {
        throw new Error('Downloaded file not found in cache');
      }
    })
    .catch((err) => {
      console.error(`[Download Error] Failed completely:`, err.message);
      if (!res.headersSent) {
        res.status(500).send('Failed to download audio track');
      }
    });
}

module.exports = {
  searchSongs,
  streamAudio,
  downloadAudio,
  renameCachedFiles
};
