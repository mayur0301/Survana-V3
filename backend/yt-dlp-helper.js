const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');

const CACHE_DIR = path.join(__dirname, 'cache');
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// Track active background downloads to prevent duplicate processes
const activeDownloads = new Set();

const COOKIES_BROWSER = process.env.YT_DLP_COOKIES_BROWSER || 'chrome';

function addCookiesArg(args) {
  if (process.env.NODE_ENV !== 'production') {
    args.push('--cookies-from-browser', COOKIES_BROWSER);
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
    
    const child = spawn('python', [
      '-m', 'yt_dlp',
      searchQuery,
      '--flat-playlist',
      '--dump-json',
      '--skip-download'
    ]);

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
      let args = ['-m', 'yt_dlp', '-g', '-f', 'bestaudio/best', youtubeUrl];
      if (useCookies) {
        args = addCookiesArg(args);
      }
      
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

/**
 * Downloads a track fully to the cache directory in the background
 */
function downloadToCache(videoId) {
  const cachePath = path.join(CACHE_DIR, `${videoId}.webm`);
  
  if (fs.existsSync(cachePath) || activeDownloads.has(videoId)) {
    return; // Already cached or currently downloading
  }

  activeDownloads.add(videoId);
  console.log(`[Background Cache] Starting download for ${videoId}...`);

  const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
  
  const runDownload = (useCookies) => {
    return new Promise((resolve, reject) => {
      let args = ['-m', 'yt_dlp', '-f', 'bestaudio', '-o', cachePath, youtubeUrl];
      if (useCookies) {
        args = addCookiesArg(args);
      }
      
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
    .catch((err) => {
      console.error(`[Background Cache] Failed caching ${videoId} completely:`, err.message);
      // Cleanup incomplete file if any
      if (fs.existsSync(cachePath)) {
        fs.unlink(cachePath, () => {});
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
  const cachePath = path.join(CACHE_DIR, `${videoId}.webm`);

  // 1. If cache exists, serve it directly.
  // Express res.sendFile automatically handles HTTP Range requests and seeking.
  if (fs.existsSync(cachePath)) {
    console.log(`[Cache Hit] Serving ${videoId} from local cache.`);
    res.setHeader('Content-Type', 'audio/webm');
    return res.sendFile(cachePath);
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
function downloadAudio(videoId, res) {
  const cachePath = path.join(CACHE_DIR, `${videoId}.webm`);
  
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

  if (fs.existsSync(cachePath)) {
    return triggerDownload(cachePath, `${videoId}.webm`);
  }

  console.log(`[Download] Downloading ${videoId} to serve...`);
  const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
  
  const runDownload = (useCookies) => {
    return new Promise((resolve, reject) => {
      let args = ['-m', 'yt_dlp', '-f', 'bestaudio', '-o', cachePath, youtubeUrl];
      if (useCookies) {
        args = addCookiesArg(args);
      }
      
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
    .then(() => {
      console.log(`[Download Success] Saved to ${cachePath}`);
      triggerDownload(cachePath, `${videoId}.webm`);
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
  downloadAudio
};
