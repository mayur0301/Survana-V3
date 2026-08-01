const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');
const os = require('os');
const config = require('../config');
const { getCacheDir } = require('../database/settings');

// Track active background downloads to prevent duplicate processes
const activeDownloads = new Set();

const COOKIES_BROWSER = config.COOKIES_BROWSER;

let systemInfoCache = null;

// Redacts credentials, tokens, cookies, and other secrets from arguments and strings
function redactSensitiveInfo(textOrArgs) {
  if (!textOrArgs) return textOrArgs;
  
  const sensitiveKeywords = ['key', 'secret', 'pass', 'token', 'cookie', 'auth', 'password'];
  
  if (Array.isArray(textOrArgs)) {
    return textOrArgs.map((arg, idx) => {
      const hasSensitiveKeyword = sensitiveKeywords.some(keyword => arg.toLowerCase().includes(keyword));
      
      // Redact the file path or browser setting if it follows a cookie argument
      if (idx > 0 && (textOrArgs[idx - 1] === '--cookies' || textOrArgs[idx - 1] === '--cookies-from-browser')) {
        return '[REDACTED_SENSITIVE_PATH_OR_BROWSER]';
      }
      
      if (hasSensitiveKeyword) {
        // Redact credentials in URLs
        return arg.replace(/(https?:\/\/)([^:]+):([^@]+)(@)/g, '$1[REDACTED_USER]:[REDACTED_PASS]$4');
      }
      
      return arg;
    });
  }

  if (typeof textOrArgs === 'string') {
    let redacted = textOrArgs.replace(/(https?:\/\/)([^:]+):([^@]+)(@)/g, '$1[REDACTED_USER]:[REDACTED_PASS]$4');
    
    const lines = redacted.split('\n');
    const cleanedLines = lines.map(line => {
      const lowerLine = line.toLowerCase();
      const isSensitiveLine = sensitiveKeywords.some(keyword => {
        return lowerLine.includes(keyword) && (lowerLine.includes('=') || lowerLine.includes(':') || lowerLine.includes('bearer') || lowerLine.includes('basic'));
      });
      return isSensitiveLine ? `[REDACTED SENSITIVE LINE]` : line;
    });
    return cleanedLines.join('\n');
  }

  return textOrArgs;
}

// Queries python, yt-dlp, and ffmpeg versions once on boot
async function getSystemInfo() {
  if (systemInfoCache) return systemInfoCache;

  const info = {
    os: `${os.type()} ${os.release()} (${os.platform()})`,
    nodeVersion: process.version,
    pythonVersion: 'unknown',
    ytdlpVersion: 'unknown',
    ffmpegVersion: 'unknown'
  };

  const runVerCommand = (cmd, args) => {
    return new Promise((resolve) => {
      const child = spawn(cmd, args);
      let output = '';
      child.stdout.on('data', (d) => output += d.toString());
      child.stderr.on('data', (d) => output += d.toString());
      child.on('close', (code) => {
        if (code === 0) {
          resolve(output.trim().split('\n')[0]);
        } else {
          resolve(`not found (exit code ${code})`);
        }
      });
      child.on('error', () => {
        resolve('not installed');
      });
    });
  };

  // Check Python
  let pythonRes = await runVerCommand('python', ['--version']);
  if (pythonRes.includes('not installed') || pythonRes.includes('not found')) {
    pythonRes = await runVerCommand('python3', ['--version']);
  }
  info.pythonVersion = pythonRes;

  // Check yt-dlp
  let ytdlpRes = await runVerCommand('python', ['-m', 'yt_dlp', '--version']);
  if (ytdlpRes.includes('not installed') || ytdlpRes.includes('not found')) {
    ytdlpRes = await runVerCommand('yt-dlp', ['--version']);
  }
  info.ytdlpVersion = ytdlpRes;

  // Check ffmpeg
  info.ffmpegVersion = await runVerCommand('ffmpeg', ['-version']);

  systemInfoCache = info;
  return info;
}

// Centralized yt-dlp spawn executor with telemetry and safety scrubbing
function runYtDlp(args, metadata = {}) {
  return new Promise(async (resolve, reject) => {
    const sysInfo = await getSystemInfo();
    const correlationId = metadata.correlationId || `corr-${Math.random().toString(36).substring(2, 11)}`;
    const requestId = metadata.requestId || 'N/A';
    const videoId = metadata.videoId || 'N/A';
    const action = metadata.action || 'run';
    const isDebug = process.env.DEBUG_YTDLP === 'true';

    const startTime = Date.now();
    const memoryBefore = process.memoryUsage();

    const logPayload = {
      logType: 'YT_DLP_TRACE',
      timestamp: new Date().toISOString(),
      correlationId,
      requestId,
      videoId,
      action,
      stage: 'initiation',
      elapsedTimeMs: 0,
      system: {
        platform: process.platform,
        cwd: process.cwd(),
        nodeVersion: sysInfo.nodeVersion,
        pythonVersion: sysInfo.pythonVersion,
        ytdlpVersion: sysInfo.ytdlpVersion,
        ffmpegVersion: sysInfo.ffmpegVersion
      },
      configuration: {
        command: 'python',
        args: redactSensitiveInfo(args),
        cookiesUsed: args.includes('--cookies') || args.includes('--cookies-from-browser'),
        cookiesFileExists: false,
        proxyUsed: args.some(arg => arg.startsWith('--proxy')) || !!process.env.HTTP_PROXY || !!process.env.HTTPS_PROXY,
        authOptionsUsed: args.some(arg => arg.startsWith('--username') || arg.startsWith('--password') || arg.startsWith('--netrc'))
      }
    };

    // Check files existence (e.g. cookies files) if referenced in args
    const cookiesIndex = args.indexOf('--cookies');
    if (cookiesIndex !== -1 && cookiesIndex + 1 < args.length) {
      const cookiesPath = args[cookiesIndex + 1];
      logPayload.configuration.cookiesFileExists = fs.existsSync(cookiesPath);
    }

    if (isDebug) {
      logPayload.system.memoryBefore = {
        rss: Math.round(memoryBefore.rss / 1024 / 1024) + ' MB',
        heapTotal: Math.round(memoryBefore.heapTotal / 1024 / 1024) + ' MB',
        heapUsed: Math.round(memoryBefore.heapUsed / 1024 / 1024) + ' MB'
      };
      console.log(`[DEBUG] [${correlationId}] Spawn options:`, JSON.stringify(logPayload, null, 2));
    }

    logPayload.stage = 'spawning';
    const child = spawn('python', args);

    let stdoutData = '';
    let stderrData = '';

    child.on('error', (err) => {
      const endTime = Date.now();
      const memoryAfter = process.memoryUsage();
      
      logPayload.stage = 'spawn_error';
      logPayload.elapsedTimeMs = endTime - startTime;
      logPayload.result = {
        success: false,
        exitCode: null,
        signal: null,
        error: err.message,
        stack: err.stack
      };

      if (isDebug) {
        logPayload.system.memoryAfter = {
          rss: Math.round(memoryAfter.rss / 1024 / 1024) + ' MB',
          heapTotal: Math.round(memoryAfter.heapTotal / 1024 / 1024) + ' MB',
          heapUsed: Math.round(memoryAfter.heapUsed / 1024 / 1024) + ' MB'
        };
      }

      console.error(`[ERROR] [${correlationId}] yt-dlp spawn failed:`, JSON.stringify(logPayload, null, 2));
      reject(err);
    });

    child.stdout.on('data', (data) => {
      stdoutData += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderrData += data.toString();
    });

    child.on('close', (code, signal) => {
      const endTime = Date.now();
      const memoryAfter = process.memoryUsage();
      
      logPayload.stage = 'completion';
      logPayload.elapsedTimeMs = endTime - startTime;
      
      const redactedStdout = redactSensitiveInfo(stdoutData);
      const redactedStderr = redactSensitiveInfo(stderrData);

      logPayload.result = {
        success: code === 0,
        exitCode: code,
        signal,
        stdoutLength: redactedStdout.length,
        stderrLength: redactedStderr.length
      };

      if (isDebug || code !== 0) {
        logPayload.result.stdout = redactedStdout;
        logPayload.result.stderr = redactedStderr;
        if (isDebug) {
          logPayload.system.memoryAfter = {
            rss: Math.round(memoryAfter.rss / 1024 / 1024) + ' MB',
            heapTotal: Math.round(memoryAfter.heapTotal / 1024 / 1024) + ' MB',
            heapUsed: Math.round(memoryAfter.heapUsed / 1024 / 1024) + ' MB'
          };
        }
      }

      if (code !== 0) {
        console.error(`[ERROR] [${correlationId}] yt-dlp failed with code ${code}:`, JSON.stringify(logPayload, null, 2));
        reject(new Error(`yt-dlp execution failed with exit code ${code}. Stderr: ${redactedStderr}`));
      } else {
        console.log(`[INFO] [${correlationId}] yt-dlp completed successfully:`, JSON.stringify(logPayload, null, 2));
        resolve(stdoutData);
      }
    });
  });
}

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
function searchSongs(query, correlationId) {
  return new Promise(async (resolve, reject) => {
    const limit = 15;
    const searchQuery = `ytsearch${limit}:${query}`;
    
    const args = prepareYtDlpArgs([
      searchQuery,
      '--flat-playlist',
      '--dump-json',
      '--skip-download'
    ], false);

    try {
      const stdoutData = await runYtDlp(args, {
        action: 'searchSongs',
        correlationId,
        query
      });

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
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Calls yt-dlp to extract the direct media stream URL
 */
function getStreamUrl(videoId, correlationId) {
  const runYtDlpWrapper = async (useCookies) => {
    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const args = prepareYtDlpArgs(['-g', '-f', 'bestaudio/best', youtubeUrl], useCookies);
    
    const stdoutData = await runYtDlp(args, {
      action: `getStreamUrl${useCookies ? 'WithCookies' : 'WithoutCookies'}`,
      correlationId,
      videoId
    });
    return stdoutData.trim();
  };

  // Try with cookies first, fallback to without cookies if it fails
  return runYtDlpWrapper(true).catch((err) => {
    console.warn(`[yt-dlp] [${correlationId}] Failed resolving stream with cookies, retrying without:`, err.message);
    return runYtDlpWrapper(false);
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
function getVideoTitle(videoId, correlationId) {
  return new Promise(async (resolve, reject) => {
    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const args = prepareYtDlpArgs(['--get-title', youtubeUrl], false);
    try {
      const stdoutData = await runYtDlp(args, {
        action: 'getVideoTitle',
        correlationId,
        videoId
      });
      if (stdoutData.trim()) {
        resolve(stdoutData.trim());
      } else {
        reject(new Error(`Failed to get title for ${videoId}`));
      }
    } catch (err) {
      reject(err);
    }
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
async function downloadToCache(videoId, correlationId) {
  const cacheDir = await getCacheDir();
  const existingFile = await findCachedFile(cacheDir, videoId);
  
  if (existingFile || activeDownloads.has(videoId)) {
    return; // Already cached or currently downloading
  }

  activeDownloads.add(videoId);
  console.log(`[Background Cache] [${correlationId || 'N/A'}] Starting download for ${videoId}...`);

  const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const outputPath = path.join(cacheDir, '%(id)s - %(title)s.webm');
  
  const runDownloadWrapper = async (useCookies) => {
    const args = prepareYtDlpArgs(['-f', 'bestaudio', '-o', outputPath, youtubeUrl], useCookies);
    await runYtDlp(args, {
      action: `downloadToCache${useCookies ? 'WithCookies' : 'WithoutCookies'}`,
      correlationId,
      videoId
    });
  };

  runDownloadWrapper(true)
    .catch((err) => {
      console.warn(`[Background Cache] [${correlationId || 'N/A'}] Failed with cookies, retrying without cookies:`, err.message);
      return runDownloadWrapper(false);
    })
    .then(() => {
      console.log(`[Background Cache] [${correlationId || 'N/A'}] Finished caching ${videoId} successfully.`);
    })
    .catch(async (err) => {
      console.error(`[Background Cache] [${correlationId || 'N/A'}] Failed caching ${videoId} completely:`, err.message);
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
  const correlationId = req.correlationId || `corr-${Math.random().toString(36).substring(2, 11)}`;
  const cacheDir = await getCacheDir();
  const cachedPath = await findCachedFile(cacheDir, videoId);

  // 1. If cache exists, serve it directly.
  // Express res.sendFile automatically handles HTTP Range requests and seeking.
  if (cachedPath) {
    console.log(`[Cache Hit] [${correlationId}] Serving ${videoId} from local cache: ${path.basename(cachedPath)}`);
    res.setHeader('Content-Type', 'audio/webm');
    return res.sendFile(cachedPath);
  }

  // 2. If not cached, resolve stream URL and proxy it while forwarding range headers
  console.log(`[Cache Miss] [${correlationId}] Streaming ${videoId} via range proxy.`);
  
  try {
    const streamUrl = await getStreamUrl(videoId, correlationId);
    
    // Set headers for range request forwarding
    const rangeHeader = req.headers.range || 'bytes=0-';
    
    const response = await fetch(streamUrl, {
      headers: {
        'Range': rangeHeader,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok && response.status !== 206) {
      console.error(`[Streaming Proxy Error] [${correlationId}] Proxy request to Google Video failed with status ${response.status}`);
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
    downloadToCache(videoId, correlationId);

  } catch (error) {
    console.error(`[Streaming Proxy Error] [${correlationId}] for video ${videoId}:`, error.message);
    if (!res.headersSent) {
      res.status(500).send('Failed to fetch media stream from source');
    }
  }
}

/**
 * Downloads audio file and serves it as a browser attachment
 */
async function downloadAudio(videoId, res, correlationId) {
  const cacheDir = await getCacheDir();
  const cachedPath = await findCachedFile(cacheDir, videoId);
  
  const triggerDownload = (filePath, fileName) => {
    res.download(filePath, fileName, (err) => {
      if (err) {
        console.error(`[Download Error] [${correlationId || 'N/A'}] during file download:`, err);
        if (!res.headersSent) {
          res.status(500).send('Download failed');
        }
      }
    });
  };

  if (cachedPath) {
    return triggerDownload(cachedPath, path.basename(cachedPath));
  }

  console.log(`[Download] [${correlationId || 'N/A'}] Downloading ${videoId} to serve...`);
  const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const outputPath = path.join(cacheDir, '%(id)s - %(title)s.webm');
  
  const runDownloadWrapper = async (useCookies) => {
    const args = prepareYtDlpArgs(['-f', 'bestaudio', '-o', outputPath, youtubeUrl], useCookies);
    await runYtDlp(args, {
      action: `downloadAudio${useCookies ? 'WithCookies' : 'WithoutCookies'}`,
      correlationId,
      videoId
    });
  };

  runDownloadWrapper(true)
    .catch((err) => {
      console.warn(`[Download] [${correlationId || 'N/A'}] Failed with cookies, retrying without:`, err.message);
      return runDownloadWrapper(false);
    })
    .then(async () => {
      const newCachedPath = await findCachedFile(cacheDir, videoId);
      if (newCachedPath) {
        console.log(`[Download Success] [${correlationId || 'N/A'}] Saved to ${newCachedPath}`);
        triggerDownload(newCachedPath, path.basename(newCachedPath));
      } else {
        throw new Error('Downloaded file not found in cache');
      }
    })
    .catch((err) => {
      console.error(`[Download Error] [${correlationId || 'N/A'}] Failed completely:`, err.message);
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
