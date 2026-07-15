# Phase 1: Security Hardening & Input Sanitization

This phase secures the codebase from filesystem tampering, excessive API requests, parameter contamination, and network vulnerabilities.

---

## 1. Absolute Path Verification & Sanitization
The endpoint `POST /api/config/cache-path` must not accept directory paths that could overwrite system files or traverse out of safe directories.

### Action Items
- Enforce that the target path is absolute.
- Resolve the path to clear dynamic segments like `..` or `./`.
- Restrict directory creation to the user's home folder or the project directory.
- Verify that OS-level root directories are blocked.

### Code Implementation (`backend/src/database/settings.js`)
```javascript
const path = require('path');
const fs = require('fs');
const os = require('os');
const Settings = require('./models/Settings');

const DEFAULT_CACHE_DIR = path.join(os.homedir(), 'SurvanaCache');

// Whitelisted base directories
const ALLOWED_ROOTS = [
  os.homedir(),
  process.cwd()
];

function isPathSafe(targetPath) {
  try {
    if (!path.isAbsolute(targetPath)) return false;
    
    // Normalize path to resolve traversal tricks
    const resolvedPath = path.resolve(targetPath);
    
    // Check if the path starts with any of the allowed base roots
    const isWithinWhitelistedRoot = ALLOWED_ROOTS.some(allowedRoot => {
      const resolvedRoot = path.resolve(allowedRoot);
      return resolvedPath.startsWith(resolvedRoot);
    });

    // Explicitly block critical system directories
    const systemFolders = [
      'C:\\Windows', 'C:\\Program Files', 'C:\\Program Files (x86)',
      '/etc', '/bin', '/sbin', '/usr', '/var', '/lib', '/sys', '/boot'
    ];
    
    const isSystemFolder = systemFolders.some(sysDir => 
      resolvedPath.toLowerCase().startsWith(sysDir.toLowerCase())
    );

    return isWithinWhitelistedRoot && !isSystemFolder;
  } catch (err) {
    return false;
  }
}

async function setCacheDir(newPath) {
  const trimmedPath = newPath.trim();
  if (!isPathSafe(trimmedPath)) {
    throw new Error('Forbidden path: Directory must reside inside user home or project root directory.');
  }

  const normalizedPath = path.normalize(trimmedPath);

  if (!fs.existsSync(normalizedPath)) {
    fs.mkdirSync(normalizedPath, { recursive: true });
  }

  await Settings.findOneAndUpdate(
    { key: 'cachePath' },
    { value: normalizedPath },
    { upsert: true, new: true }
  );
}
```

---

## 2. API Input Validation (Zod Validation Middleware)
Unsanitized client payloads can cause server exceptions or unexpected behaviors. We will implement `zod` validation middleware to secure request parameters and bodies.

### Action Items
- Install dependency: `npm install zod --prefix backend`.
- Define validators for `search`, `playlists`, and `history`.

### Code Implementation (`backend/src/middleware/validate.js`)
```javascript
const { z } = require('zod');

const validate = (schema) => (req, res, next) => {
  try {
    schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    next();
  } catch (error) {
    return res.status(400).json({ error: error.errors.map(e => e.message).join(', ') });
  }
};

// Validation Schemas
const searchSchema = z.object({
  query: z.object({
    q: z.string().min(1, 'Search query cannot be empty').max(100, 'Search query is too long')
  })
});

const configSchema = z.object({
  body: z.object({
    cachePath: z.string().min(3, 'Path must be at least 3 characters long')
  })
});

const playlistCreateSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Playlist name is required').max(50, 'Playlist name cannot exceed 50 characters')
  })
});

module.exports = {
  validate,
  searchSchema,
  configSchema,
  playlistCreateSchema
};
```

---

## 3. Network Protection (CORS, Helmet, Rate Limiter)

### Action Items
- Enforce strict `Helmet` policy configuration in `app.js`.
- Protect the server from brute force by placing limiters on all routes.

### Code Implementation (`backend/src/middleware/security.js`)
```javascript
const rateLimit = require('express-rate-limit');

// Rate limit for searches (prevent yt-dlp API abuse)
const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: { error: 'Too many search requests. Please wait a minute.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API request limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Too many requests from this IP. Please try again later.' }
});

module.exports = {
  searchLimiter,
  apiLimiter
};
```
Mount them in `backend/src/app.js`:
```javascript
const { apiLimiter } = require('./middleware/security');
app.use('/api', apiLimiter);
```
