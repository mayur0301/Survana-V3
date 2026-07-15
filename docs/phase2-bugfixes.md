# Phase 2: Resource Management & Bug Fixes

This phase focuses on eliminating CPU bottlenecks from duplicate processes, implementing search caching, preventing event-loop blockage on boot, and fixing frontend CSS theme discrepancies.

---

## 1. Concurrency Queue for `yt-dlp` Spawns
To prevent the server from running out of memory or getting blocked by YouTube (HTTP 429), we will throttle the spawned subprocesses to a maximum of 2 parallel jobs using a Task Queue.

### Action Items
- Create `backend/src/queue/downloadQueue.js` to coordinate background caching downloads.
- Wrap the execution of `yt-dlp` in queue-able tasks.

### Code Implementation (`backend/src/queue/downloadQueue.js`)
```javascript
class DownloadQueue {
  constructor(maxConcurrency = 2) {
    this.maxConcurrency = maxConcurrency;
    this.activeCount = 0;
    this.pendingTasks = [];
    this.activeDownloads = new Set();
  }

  enqueue(videoId, taskFn) {
    // Avoid queuing duplicate downloads for the same video ID
    if (this.activeDownloads.has(videoId) || this.pendingTasks.some(t => t.videoId === videoId)) {
      console.log(`[Queue] Task for ${videoId} is already queued or running. Skipping.`);
      return;
    }

    this.pendingTasks.push({ videoId, taskFn });
    this.processNext();
  }

  async processNext() {
    if (this.activeCount >= this.maxConcurrency || this.pendingTasks.length === 0) {
      return;
    }

    const { videoId, taskFn } = this.pendingTasks.shift();
    this.activeCount++;
    this.activeDownloads.add(videoId);

    console.log(`[Queue] Starting download job for ${videoId}. Active: ${this.activeCount}/${this.maxConcurrency}`);

    try {
      await taskFn();
    } catch (err) {
      console.error(`[Queue] Job execution failed for ${videoId}:`, err.message);
    } finally {
      this.activeCount--;
      this.activeDownloads.delete(videoId);
      console.log(`[Queue] Finished job for ${videoId}. Active: ${this.activeCount}/${this.maxConcurrency}`);
      this.processNext();
    }
  }
}

const cacheQueue = new DownloadQueue(2); // Throttles to max 2 concurrent downloads
module.exports = cacheQueue;
```

---

## 2. In-Memory Search Caching
Currently, every search triggers an external scraper process. We will cache search results in an LRU (Least Recently Used) cache model to reduce loading times.

### Action Items
- Save search results with a Time-To-Live (TTL) of 15 minutes.
- Check cache before initiating any `yt-dlp` searches.

### Code Implementation (`backend/src/modules/songs/songs.controller.js`)
```javascript
const searchCache = new Map();
const CACHE_TTL = 15 * 60 * 1000; // 15 Minutes in milliseconds

const cleanExpiredCache = () => {
  const now = Date.now();
  for (const [key, val] of searchCache.entries()) {
    if (now - val.timestamp > CACHE_TTL) {
      searchCache.delete(key);
    }
  }
};

const search = async (req, res, next) => {
  const query = req.query.q?.trim().toLowerCase();
  if (!query) {
    return res.status(400).json({ error: 'Search query is required' });
  }

  // Periodic cleanup
  cleanExpiredCache();

  // Cache Hit check
  if (searchCache.has(query)) {
    const cachedEntry = searchCache.get(query);
    console.log(`[Search Cache Hit] Serving results for: "${query}"`);
    return res.json(cachedEntry.results);
  }

  try {
    const results = await searchSongs(query);
    searchCache.set(query, {
      results,
      timestamp: Date.now()
    });
    res.json(results);
  } catch (error) {
    next(error);
  }
};
```

---

## 3. Resolving Event-Loop Block in Cache Migration
On app launch, `renameCachedFiles()` reads all cached WebM files and migrates them. This process uses synchronous-like checks in a loop, which can block HTTP request serving on boot.

### Action Items
- Refactor the migration scanner to handle file renames incrementally.
- Introduce `setImmediate` or chunked timeouts to yield control back to the event loop.

### Code Implementation (`backend/src/utils/yt-dlp-helper.js`)
```javascript
async function renameCachedFiles() {
  try {
    const cacheDir = await getCacheDir();
    if (!fs.existsSync(cacheDir)) return;

    const files = await fs.promises.readdir(cacheDir);
    const oldFiles = files.filter(f => f.endsWith('.webm') && !f.includes(' - '));

    if (oldFiles.length === 0) return;

    console.log(`[Cache Migration] Found ${oldFiles.length} files to migrate.`);

    // Run migration incrementally without blocking the main event loop
    let index = 0;
    
    function migrateNext() {
      if (index >= oldFiles.length) {
        console.log('[Cache Migration] Completed all legacy file renames.');
        return;
      }

      const file = oldFiles[index++];
      const videoId = path.basename(file, '.webm');
      if (videoId.length !== 11) {
        setImmediate(migrateNext);
        return;
      }

      // Process single file migration
      (async () => {
        try {
          let title = await lookupSongTitleInDb(videoId);
          if (!title) {
            title = await getVideoTitle(videoId).catch(() => null);
          }
          
          const finalTitle = title || 'Unknown Title';
          const sanitizedTitle = sanitizeFilename(finalTitle);
          const oldPath = path.join(cacheDir, file);
          const newPath = path.join(cacheDir, `${videoId} - ${sanitizedTitle}.webm`);

          if (fs.existsSync(oldPath)) {
            await fs.promises.rename(oldPath, newPath);
            console.log(`[Cache Migration] Migrated: ${file} -> ${videoId} - ${sanitizedTitle}.webm`);
          }
        } catch (e) {
          console.error(`[Cache Migration] Error migrating file ${file}:`, e.message);
        } finally {
          // Yield to event loop before starting the next migration task
          setImmediate(migrateNext);
        }
      })();
    }

    setImmediate(migrateNext);
  } catch (e) {
    console.error('[Cache Migration] Initialization failed:', e.message);
  }
}
```

---

## 4. UI Stability & Theme Fixes
- **Visualizer Error Boundary**: Wrap `Visualizer.jsx` in a React Error Boundary component. If the Web Audio API fails to initialize or resume due to audio element binding restrictions, the boundary will catch the exception and display a fallback without crashing the parent `AudioPlayer` bar.
- **CSS Clean-up**: Update references in `frontend/src/index.css` to accurately rename variable classes (e.g. rename `--color-accent-purple` to `--color-accent-orange` in variables, selectors, and background colors to prevent team confusion).
