# Phase 3: Enterprise Features & Scaling

This phase outlines the architecture and execution specifications for adding multi-user isolation, offline browser support, adaptive audio compression, and automated cache quota management.

---

## 1. User Authentication (JWT)
To transition from a globally shared database instance to individual user accounts.

### Schema Blueprint (`backend/src/database/models/User.js`)
```javascript
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true, minlength: 3 },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  createdAt: { type: Date, default: Date.now }
});

// Pre-save password hashing hook
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

module.exports = mongoose.model('User', UserSchema);
```

### Authentication Middleware (`backend/src/middleware/auth.js`)
```javascript
const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access denied: Token missing' });

  jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret', (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

module.exports = { authenticateToken };
```

---

## 2. Progressive Web App (PWA) Offline Playback
To stream and play tracks offline, we configure a service worker utilizing the **Cache Storage API** to intercept and store streaming media files locally on the client.

### Service Worker (`frontend/public/sw.js`)
```javascript
const CACHE_NAME = 'survana-stream-cache-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Intercept media fetch requests
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Cache check for stream requests
  if (url.pathname.startsWith('/api/stream/')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(event.request);
        if (cachedResponse) {
          return cachedResponse; // Serve from browser cache
        }
        
        // Fetch from network and save to cache
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse.status === 206 || networkResponse.ok) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        });
      })
    );
  }
});
```

---

## 3. Connection-Adaptive FFmpeg Audio Transcoding
For users on slow cellular networks, we can use `fluent-ffmpeg` to down-sample audio streams on the server to prevent buffering.

### Action Items
- Mount `ffmpeg` inside the application runtime.
- Stream transcode on the fly.

### Code Implementation (`backend/src/utils/transcoder.js`)
```javascript
const ffmpeg = require('fluent-ffmpeg');

function transcodeStream(inputUrlOrStream, res, bitrate = '128k') {
  res.setHeader('Content-Type', 'audio/mp3');
  
  ffmpeg(inputUrlOrStream)
    .audioCodec('libmp3lame')
    .audioBitrate(bitrate)
    .format('mp3')
    .on('error', (err) => {
      console.error('[Transcoder Error]:', err.message);
      if (!res.headersSent) {
        res.status(500).send('Transcoding failed');
      }
    })
    .pipe(res, { end: true });
}

module.exports = { transcodeStream };
```

---

## 4. Automated Disk Space Cleanup Task
To prevent disk exhaustion on the host system, we will deploy a scheduled cleanup script.

### Code Implementation (`backend/src/cron/diskCleanup.js`)
```javascript
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const { getCacheDir } = require('../database/settings');

const DISK_MAX_BYTES = 20 * 1024 * 1024 * 1024; // 20 GB Limit

async function runCleanupJob() {
  try {
    const cacheDir = await getCacheDir();
    if (!fs.existsSync(cacheDir)) return;

    const files = await fs.promises.readdir(cacheDir);
    let totalSize = 0;
    const fileList = [];

    // Retrieve size & access metadata for each file
    for (const file of files) {
      if (!file.endsWith('.webm')) continue;
      
      const filePath = path.join(cacheDir, file);
      const stat = await fs.promises.stat(filePath);
      totalSize += stat.size;
      fileList.push({ path: filePath, size: stat.size, atime: stat.atime });
    }

    console.log(`[Disk Cleanup] Current Cache Size: ${(totalSize / (1024 * 1024)).toFixed(2)} MB`);

    if (totalSize > DISK_MAX_BYTES) {
      console.log(`[Disk Cleanup] Cache limit exceeded. Cleaning up...`);
      
      // Sort files: oldest accessed file first
      fileList.sort((a, b) => a.atime - b.atime);

      for (const file of fileList) {
        if (totalSize <= DISK_MAX_BYTES) break;
        
        await fs.promises.unlink(file.path);
        totalSize -= file.size;
        console.log(`[Disk Cleanup] Deleted cached file: ${path.basename(file.path)}`);
      }
    }
  } catch (err) {
    console.error('[Disk Cleanup Error]:', err.message);
  }
}

// Run cleanup every day at midnight
cron.schedule('0 0 * * *', runCleanupJob);
```
